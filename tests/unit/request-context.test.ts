import { describe, expect, it } from "vitest";
import {
  REQUEST_ID_HEADER,
  resolveRequestId,
  withRequestIdHeader,
} from "../../src/lib/request-context";

describe("request context helpers", () => {
  it("preserves a request id when provided", () => {
    const request = new Request("http://localhost", {
      headers: {
        [REQUEST_ID_HEADER]: "req_123",
      },
    });

    expect(resolveRequestId(request)).toBe("req_123");
  });

  it("creates a request id when missing", () => {
    expect(resolveRequestId(new Headers())).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("adds the header to an outgoing response", () => {
    const headers = withRequestIdHeader(undefined, "req_456");
    expect(headers.get(REQUEST_ID_HEADER)).toBe("req_456");
  });
});
