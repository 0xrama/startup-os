import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleDocumentProcessing,
  documentProcessingServices,
} from "@/lib/document-processing";
import { DOCUMENT_MAX_BYTES } from "@/lib/ai-limits";

const mocks = {
  findFirst: vi.fn(),
  processDocumentIntelligence: vi.fn(),
  requireApiLlcAccess: vi.fn(),
  requireApiContext: vi.fn(),
};

async function process(request: Request) {
  const response = await handleDocumentProcessing(
    request,
    {
      params: Promise.resolve({ id: "doc-1" }),
    },
    { ...documentProcessingServices, ...mocks, findDocument: mocks.findFirst }
  );

  if (!response) throw new Error("Missing route response");

  return response;
}

function request(form?: FormData) {
  return new Request("http://localhost/api/documents/doc-1/process", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiContext.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
  mocks.findFirst.mockResolvedValue({ id: "doc-1", llcId: "llc-1" });
  mocks.requireApiLlcAccess.mockResolvedValue({});
  mocks.processDocumentIntelligence.mockResolvedValue({
    status: "queued",
    jobId: "job-1",
  });
});

describe("document analysis consent", () => {
  it("requires consent for a stored plaintext document too", async () => {
    expect((await process(request())).status).toBe(400);
    expect(mocks.processDocumentIntelligence).not.toHaveBeenCalled();
  });

  it("rejects a readable upload without consent", async () => {
    const form = new FormData();
    form.set("file", new File(["Test"], "test.txt", { type: "text/plain" }));
    expect((await process(request(form))).status).toBe(400);
    expect(mocks.processDocumentIntelligence).not.toHaveBeenCalled();
  });

  it("accepts consent and queues the file independently of browser cancellation", async () => {
    const form = new FormData();
    form.set("consent", "true");
    form.set("file", new File(["Test"], "test.txt", { type: "text/plain" }));
    const response = await process(request(form));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "queued", jobId: "job-1" });
    expect(mocks.processDocumentIntelligence).toHaveBeenCalledWith(
      "doc-1",
      expect.any(File)
    );
  });

  it("enforces ownership before reading an upload", async () => {
    mocks.requireApiLlcAccess.mockResolvedValue({
      response: new Response("Not found", { status: 404 }),
    });
    expect((await process(request())).status).toBe(404);
    expect(mocks.processDocumentIntelligence).not.toHaveBeenCalled();
  });

  it("rejects an oversized request before parsing multipart data", async () => {
    const oversized = new Request(
      "http://localhost/api/documents/doc-1/process",
      {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data; boundary=x",
          "Content-Length": String(DOCUMENT_MAX_BYTES * 2),
        },
        body: "x",
      }
    );

    expect((await process(oversized)).status).toBe(413);
    expect(mocks.processDocumentIntelligence).not.toHaveBeenCalled();
  });
});
