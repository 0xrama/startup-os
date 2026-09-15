// The assistant answers in Markdown. This parses the subset models actually
// produce for compliance answers: headings, lists, tables, code, emphasis, and
// links. The renderer turns these blocks into React elements, so message text
// is never injected as HTML.

export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "emphasis"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; value: string; href: string };

export type ListItem = { text: string; depth: number };

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { kind: "code"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "rule" };

// Numbered groups keep this readable under the ES2017 target, which rejects
// named groups. 1 strong, 2 code, 3 link label, 4 link href, 5 the character
// before an emphasis run, 6 emphasis. Group 5 keeps `snake_case` identifiers
// intact without a lookbehind.
const INLINE_PATTERN =
  /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(^|[^\w*_])[*_]([^*_\n]+)[*_](?!\w)/g;

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;

const RULE_PATTERN = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

const BULLET_PATTERN = /^(\s*)[-*+]\s+(.*)$/;

const ORDERED_PATTERN = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;

const TABLE_DIVIDER_PATTERN = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;
  INLINE_PATTERN.lastIndex = 0;
  let match = INLINE_PATTERN.exec(text);

  while (match !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: "text", value: text.slice(cursor, match.index) });
    }

    const [, strong, code, label, href, emphasisPrefix, emphasis] = match;

    if (strong !== undefined) {
      tokens.push({ kind: "strong", value: strong });
    } else if (code !== undefined) {
      tokens.push({ kind: "code", value: code });
    } else if (label !== undefined && href !== undefined) {
      tokens.push({ kind: "link", value: label, href });
    } else if (emphasis !== undefined) {
      if (emphasisPrefix) tokens.push({ kind: "text", value: emphasisPrefix });
      tokens.push({ kind: "emphasis", value: emphasis });
    }

    cursor = match.index + match[0].length;
    match = INLINE_PATTERN.exec(text);
  }

  if (cursor < text.length) {
    tokens.push({ kind: "text", value: text.slice(cursor) });
  }

  return tokens;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");

  return trimmed.split("|").map((cell) => cell.trim());
}

function startsNewBlock(line: string): boolean {
  return (
    line.trim() === "" ||
    line.trim().startsWith("```") ||
    HEADING_PATTERN.test(line) ||
    RULE_PATTERN.test(line) ||
    BULLET_PATTERN.test(line) ||
    ORDERED_PATTERN.test(line)
  );
}

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const body: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }

      index += 1;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    if (RULE_PATTERN.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    const heading = HEADING_PATTERN.exec(line);

    if (heading) {
      // SAFETY: Math.min caps the captured "#" run at 3, matching the union.
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;

      blocks.push({ kind: "heading", level, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const divider = lines[index + 1];

    if (
      line.includes("|") &&
      divider !== undefined &&
      divider.includes("-") &&
      TABLE_DIVIDER_PATTERN.test(divider)
    ) {
      const header = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ kind: "table", header, rows });
      continue;
    }

    const ordered = ORDERED_PATTERN.exec(line);
    const bullet = BULLET_PATTERN.exec(line);

    if (ordered || bullet) {
      const isOrdered = ordered !== null;
      const start = ordered ? Number(ordered[2]) : 1;
      const items: ListItem[] = [];

      while (index < lines.length) {
        const item = isOrdered
          ? ORDERED_PATTERN.exec(lines[index])
          : BULLET_PATTERN.exec(lines[index]);

        if (!item) break;

        items.push({
          text: isOrdered ? item[3] : item[2],
          depth: Math.min(Math.floor(item[1].length / 2), 3),
        });
        index += 1;
      }

      blocks.push({ kind: "list", ordered: isOrdered, start, items });
      continue;
    }

    const paragraph: string[] = [];

    while (index < lines.length && !startsNewBlock(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }

  return blocks;
}
