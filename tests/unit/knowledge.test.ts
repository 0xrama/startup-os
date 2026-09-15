import { describe, expect, it } from "vitest";
import {
  buildKnowledgeRows,
  chunkText,
  toCitation,
} from "../../src/lib/knowledge";

describe("chunkText", () => {
  it("splits content into fixed-size chunks", () => {
    expect(chunkText("abcdef", 2)).toEqual(["ab", "cd", "ef"]);
  });

  it("normalizes whitespace", () => {
    expect(chunkText("  a   b  ", 5)).toEqual(["a b"]);
  });

  it("returns nothing for blank input", () => {
    expect(chunkText("   \n\t ")).toEqual([]);
  });

  it.each([0, -1, 0.5, Number.NaN])("rejects invalid chunk size %s", (size) => {
    expect(() => chunkText("abc", size)).toThrow("positive integer");
  });
});

describe("toCitation", () => {
  it("builds a citation from chunk metadata", () => {
    const citation = toCitation({
      id: "chunk-1",
      content: "Form 5472 generally applies to 25% foreign-owned entities.",
      source: "IRS Form 5472 Guidance",
      metadata: { kind: "irs", title: "Form 5472 Guidance", page: 2 },
      score: 0.5,
    });

    expect(citation).toMatchObject({
      label: "Form 5472 Guidance",
      sourceType: "irs",
      page: 2,
    });
  });

  it("defaults the source type when metadata has no kind", () => {
    const citation = toCitation({
      id: "chunk-2",
      content: "Some excerpt",
      source: "Fallback source",
      metadata: {},
      score: 0.1,
    });

    expect(citation).toMatchObject({
      label: "Fallback source",
      sourceType: "irs",
    });
  });
});

describe("document knowledge rows", () => {
  it("sets a cascading document reference for every extracted chunk", () => {
    const [row] = buildKnowledgeRows({
      source: "Test",
      sourceId: "doc-1",
      chunks: ["Text"],
      metadata: { documentId: "doc-1", llcId: "llc-1", kind: "user_document" },
    });

    expect(row).toMatchObject({ id: "doc-1:1", documentId: "doc-1" });
  });
});
