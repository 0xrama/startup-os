import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { authorizeInternalRequest } from "../../src/lib/internal-auth";

function requestWith(init: { headers?: Record<string, string>; url?: string }) {
  return new NextRequest(init.url ?? "http://localhost/api/internal/test", {
    headers: init.headers,
  });
}

describe("authorizeInternalRequest", () => {
  beforeEach(() => {
    process.env.INTERNAL_CRON_SECRET = "top-secret";
  });

  afterEach(() => {
    delete process.env.INTERNAL_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("accepts the x-internal-secret header", () => {
    const request = requestWith({
      headers: { "x-internal-secret": "top-secret" },
    });

    expect(authorizeInternalRequest(request)).toBe(true);
  });

  it("accepts a bearer token", () => {
    const request = requestWith({
      headers: { authorization: "Bearer top-secret" },
    });

    expect(authorizeInternalRequest(request)).toBe(true);
  });

  it("accepts a query parameter", () => {
    const request = requestWith({
      url: "http://localhost/api/internal?secret=top-secret",
    });

    expect(authorizeInternalRequest(request)).toBe(true);
  });

  it("falls back to CRON_SECRET", () => {
    delete process.env.INTERNAL_CRON_SECRET;
    process.env.CRON_SECRET = "cron-secret";

    const request = requestWith({
      headers: { "x-internal-secret": "cron-secret" },
    });

    expect(authorizeInternalRequest(request)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const request = requestWith({ headers: { "x-internal-secret": "nope" } });

    expect(authorizeInternalRequest(request)).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    delete process.env.INTERNAL_CRON_SECRET;

    const request = requestWith({
      headers: { "x-internal-secret": "top-secret" },
    });

    expect(authorizeInternalRequest(request)).toBe(false);
  });
});
