import { describe, expect, it } from "vitest";
import { GET } from "../../src/app/api/health/route";

describe("GET /api/health", () => {
  it("returns a healthy payload and echoes the request id", async () => {
    const request = new Request("http://localhost/api/health", {
      headers: {
        "x-request-id": "health-test",
      },
    });

    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("health-test");
    expect(body).toMatchObject({
      status: "ok",
      requestId: "health-test",
    });
  });
});
