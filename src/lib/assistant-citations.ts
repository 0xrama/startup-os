import type { Citation } from "./knowledge";

// Every source shown to the model in one turn gets a bracketed number. After
// generation, only the numbers that appear in the answer become saved
// citations, so the Sources block reflects what the answer relied on rather
// than what retrieval happened to return.

const MARKER_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

function citationKey(citation: Citation) {
  return [
    citation.sourceTitle,
    citation.section ?? "",
    citation.page ?? "",
    citation.documentId ?? "",
  ].join("|");
}

export type CitationRegistry = ReturnType<typeof createCitationRegistry>;

export function createCitationRegistry() {
  const sources: Citation[] = [];
  const indexByKey = new Map<string, number>();

  return {
    // Returns the marker the model should use, such as "[3]". Repeated sources
    // reuse their first number so the model sees one label per source.
    add(citation: Citation) {
      const key = citationKey(citation);
      let index = indexByKey.get(key);

      if (index === undefined) {
        index = sources.push({ ...citation, label: `[${sources.length + 1}]` });
        indexByKey.set(key, index);
      }

      return `[${index}]`;
    },

    get size() {
      return sources.length;
    },

    // Keeps only the cited sources and renumbers both the text markers and the
    // citations 1..m in order of first mention.
    resolve(text: string) {
      const order: number[] = [];

      for (const match of text.matchAll(MARKER_PATTERN)) {
        for (const part of match[1].split(",")) {
          const index = Number(part.trim());

          if (index >= 1 && index <= sources.length && !order.includes(index))
            order.push(index);
        }
      }

      const renumbered = new Map(
        order.map((index, position) => [index, position + 1])
      );

      const citations = order.map((index) => ({
        ...sources[index - 1],
        label: `[${renumbered.get(index)}]`,
      }));

      const resolvedText = text.replace(
        MARKER_PATTERN,
        (marker: string, list: string) => {
          const numbers = list
            .split(",")
            .flatMap((part) => renumbered.get(Number(part.trim())) ?? []);

          return numbers.length ? `[${numbers.join(", ")}]` : marker;
        }
      );

      return { text: resolvedText, citations };
    },
  };
}
