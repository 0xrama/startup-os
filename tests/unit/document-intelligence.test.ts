import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  processDocumentIntelligence as processDocument,
  documentIntelligenceServices,
} from "@/lib/document-intelligence";
import { DOCUMENT_MAX_TEXT_CHARS } from "@/lib/ai-limits";
import { getDb } from "@/lib/db";

const mocks = vi.hoisted(() => ({
  findDocument: vi.fn(),
  findNotice: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  classifyExtractedText: vi.fn(),
  getObjectBytes: vi.fn(),
  storeKnowledgeChunks: vi.fn(),
  deleteKnowledgeChunksBySource: vi.fn(),
}));

function processDocumentIntelligence(id: string, file?: File) {
  return processDocument(id, file, undefined, {
    ...documentIntelligenceServices,
    ...mocks,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
  vi.spyOn(getDb().query.documents, "findFirst").mockImplementation(
    mocks.findDocument
  );
  vi.spyOn(getDb().query.noticeCases, "findFirst").mockImplementation(
    mocks.findNotice
  );
  vi.spyOn(getDb(), "update").mockImplementation(mocks.update);
  vi.spyOn(getDb(), "insert").mockImplementation(mocks.insert);
  mocks.findDocument.mockResolvedValue({
    id: "doc-1",
    llcId: "llc-1",
    userId: "user-1",
    name: "Encrypted document",
    wrappedFileKey: {},
  });
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: "doc-1" }]);
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.findNotice.mockResolvedValue(undefined);
  mocks.classifyExtractedText.mockResolvedValue({
    documentType: "other",
    summary: "Summary",
  });
});

describe("document intelligence", () => {
  it("keeps encrypted files private unless a readable copy is supplied", async () => {
    expect(await processDocumentIntelligence("doc-1")).toEqual({
      status: "skipped",
    });
    expect(mocks.classifyExtractedText).not.toHaveBeenCalled();
    expect(mocks.getObjectBytes).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("analyzes a consented readable copy without reading ciphertext from storage", async () => {
    const file = new File(["Business records"], "records.txt", {
      type: "text/plain",
    });

    expect(await processDocumentIntelligence("doc-1", file)).toEqual({
      status: "ready",
    });
    expect(mocks.getObjectBytes).not.toHaveBeenCalled();
    expect(mocks.storeKnowledgeChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "records.txt",
        chunks: ["Business records"],
        metadata: expect.objectContaining({
          llcId: "llc-1",
          documentId: "doc-1",
        }),
      }),
      expect.anything()
    );
  });

  it("does not duplicate model work when the document is already processing", async () => {
    mocks.returning.mockResolvedValue([]);
    expect(
      await processDocumentIntelligence("doc-1", new File(["x"], "x.txt"))
    ).toEqual({ status: "processing" });
    expect(mocks.classifyExtractedText).not.toHaveBeenCalled();
  });

  it("bounds indexed text and classification input", async () => {
    await processDocumentIntelligence(
      "doc-1",
      new File(["x".repeat(DOCUMENT_MAX_TEXT_CHARS + 100)], "x.txt", {
        type: "text/plain",
      })
    );
    const stored = mocks.storeKnowledgeChunks.mock.calls[0][0];
    expect(stored.chunks.join("").length).toBe(DOCUMENT_MAX_TEXT_CHARS);
    expect(mocks.classifyExtractedText.mock.calls[0][0].length).toBe(
      DOCUMENT_MAX_TEXT_CHARS
    );
    expect(mocks.classifyExtractedText.mock.calls[0][1]).toBeInstanceOf(
      AbortSignal
    );
  });

  it("does not turn every IRS document into a notice", async () => {
    await processDocumentIntelligence(
      "doc-1",
      new File(["IRS Form 1065 instructions"], "form.txt", {
        type: "text/plain",
      })
    );
    expect(mocks.findNotice).not.toHaveBeenCalled();
  });

  it("does not reopen a confirmed notice on re-analysis", async () => {
    mocks.classifyExtractedText.mockResolvedValue({
      documentType: "notice",
      summary: "A notice",
    });
    mocks.findNotice.mockResolvedValue({ id: "notice-1", status: "confirmed" });
    await processDocumentIntelligence(
      "doc-1",
      new File(["Notice CP123"], "notice.txt", { type: "text/plain" })
    );
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledTimes(2);
  });

  it("clears processing state after model failure without storing provider payloads", async () => {
    mocks.classifyExtractedText.mockRejectedValueOnce(
      new Error("private provider payload")
    );
    await expect(
      processDocumentIntelligence(
        "doc-1",
        new File(["text"], "x.txt", { type: "text/plain" })
      )
    ).rejects.toThrow();
    expect(mocks.set).toHaveBeenLastCalledWith(
      expect.objectContaining({
        processingStatus: "failed",
        processingError: expect.not.stringContaining(
          "private provider payload"
        ),
      })
    );
  });
});
