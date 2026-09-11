/**
 * JSON-compatible values — the shape persisted by `text(..., { mode: "json" })`
 * columns and produced by `JSON.parse`.
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
