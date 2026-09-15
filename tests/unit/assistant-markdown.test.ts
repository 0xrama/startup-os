import { describe, expect, it } from "vitest";
import {
  parseBlocks,
  parseInline,
} from "@/components/dashboard/assistant/markdown-parser";

describe("parseInline", () => {
  it("splits strong, code, and link spans out of surrounding text", () => {
    expect(
      parseInline(
        "File **Form 5472** with `pro forma 1120`. See [the IRS page](https://irs.gov/f5472)."
      )
    ).toEqual([
      { kind: "text", value: "File " },
      { kind: "strong", value: "Form 5472" },
      { kind: "text", value: " with " },
      { kind: "code", value: "pro forma 1120" },
      { kind: "text", value: ". See " },
      {
        kind: "link",
        value: "the IRS page",
        href: "https://irs.gov/f5472",
      },
      { kind: "text", value: "." },
    ]);
  });

  it("keeps the character before an emphasis run in the output", () => {
    expect(parseInline("File *before* the deadline")).toEqual([
      { kind: "text", value: "File" },
      { kind: "text", value: " " },
      { kind: "emphasis", value: "before" },
      { kind: "text", value: " the deadline" },
    ]);
  });

  it("leaves underscores inside identifiers alone", () => {
    expect(parseInline("use tax_year_end")).toEqual([
      { kind: "text", value: "use tax_year_end" },
    ]);
  });

  it("ignores link targets that are not http URLs", () => {
    expect(parseInline("[click](javascript:alert(1))")).toEqual([
      { kind: "text", value: "[click](javascript:alert(1))" },
    ]);
  });
});

describe("parseBlocks", () => {
  it("reads headings, paragraphs, and ordered lists", () => {
    expect(
      parseBlocks(
        "## Next steps\n\nYou have two filings.\n\n1. File Form 5472\n2. File the pro forma 1120"
      )
    ).toEqual([
      { kind: "heading", level: 2, text: "Next steps" },
      { kind: "paragraph", text: "You have two filings." },
      {
        kind: "list",
        ordered: true,
        start: 1,
        items: [
          { text: "File Form 5472", depth: 0 },
          { text: "File the pro forma 1120", depth: 0 },
        ],
      },
    ]);
  });

  it("keeps a bullet list separate from the paragraph above it", () => {
    expect(parseBlocks("Bring these:\n- Passport\n- EIN letter")).toEqual([
      { kind: "paragraph", text: "Bring these:" },
      {
        kind: "list",
        ordered: false,
        start: 1,
        items: [
          { text: "Passport", depth: 0 },
          { text: "EIN letter", depth: 0 },
        ],
      },
    ]);
  });

  it("records nesting depth for indented bullets", () => {
    const blocks = parseBlocks("- Owner\n    - Contribution");

    expect(blocks).toEqual([
      {
        kind: "list",
        ordered: false,
        start: 1,
        items: [
          { text: "Owner", depth: 0 },
          { text: "Contribution", depth: 2 },
        ],
      },
    ]);
  });

  it("reads a pipe table with its header row", () => {
    expect(
      parseBlocks("| Form | Due |\n| --- | --- |\n| 5472 | Apr 15 |")
    ).toEqual([
      {
        kind: "table",
        header: ["Form", "Due"],
        rows: [["5472", "Apr 15"]],
      },
    ]);
  });

  it("keeps fenced code verbatim", () => {
    expect(parseBlocks("```\nline 1\n  line 2\n```")).toEqual([
      { kind: "code", text: "line 1\n  line 2" },
    ]);
  });

  it("does not treat a thematic break as a bullet", () => {
    expect(parseBlocks("Before\n\n---\n\nAfter")).toEqual([
      { kind: "paragraph", text: "Before" },
      { kind: "rule" },
      { kind: "paragraph", text: "After" },
    ]);
  });

  it("keeps a partial stream renderable", () => {
    expect(parseBlocks("## Heading\n\nHalf a sent")).toEqual([
      { kind: "heading", level: 2, text: "Heading" },
      { kind: "paragraph", text: "Half a sent" },
    ]);
  });
});
