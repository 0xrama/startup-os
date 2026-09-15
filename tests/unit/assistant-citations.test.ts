import { describe, expect, it } from "vitest";
import { createCitationRegistry } from "@/lib/assistant-citations";
import type { Citation } from "@/lib/knowledge";

function source(sourceTitle: string, section?: string): Citation {
  return {
    label: sourceTitle,
    sourceType: "irs",
    sourceTitle,
    excerpt: `${sourceTitle} excerpt`,
    section,
  };
}

describe("citation registry", () => {
  it("numbers sources in registration order and reuses numbers for repeats", () => {
    const registry = createCitationRegistry();

    expect(registry.add(source("Form 5472 instructions", "Part IV"))).toBe(
      "[1]"
    );
    expect(registry.add(source("Publication 583"))).toBe("[2]");
    expect(registry.add(source("Form 5472 instructions", "Part IV"))).toBe(
      "[1]"
    );
    // A different section of the same document is a distinct source.
    expect(registry.add(source("Form 5472 instructions", "Part V"))).toBe(
      "[3]"
    );
    expect(registry.size).toBe(3);
  });

  it("keeps only cited sources, in order of first mention, and renumbers", () => {
    const registry = createCitationRegistry();
    registry.add(source("A"));
    registry.add(source("B"));
    registry.add(source("C"));
    registry.add(source("D"));

    const resolved = registry.resolve(
      "Distributions are reportable [3]. Keep records [1]. Also [3] again."
    );

    expect(resolved.citations.map((c) => [c.label, c.sourceTitle])).toEqual([
      ["[1]", "C"],
      ["[2]", "A"],
    ]);
    expect(resolved.text).toBe(
      "Distributions are reportable [1]. Keep records [2]. Also [1] again."
    );
  });

  it("splits comma lists and drops numbers that name no source", () => {
    const registry = createCitationRegistry();
    registry.add(source("A"));
    registry.add(source("B"));

    const resolved = registry.resolve("See [2, 1] and line [7].");

    expect(resolved.citations.map((c) => c.sourceTitle)).toEqual(["B", "A"]);
    expect(resolved.text).toBe("See [1, 2] and line [7].");
  });

  it("returns no citations when the answer cites nothing", () => {
    const registry = createCitationRegistry();
    registry.add(source("A"));

    expect(registry.resolve("General guidance only.")).toEqual({
      text: "General guidance only.",
      citations: [],
    });
  });
});
