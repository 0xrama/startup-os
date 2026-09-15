import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  handleHealthCheck,
  healthCheckServices,
} from "../../src/lib/health-check";

const mocks = {
  authorizeInternalRequest: vi.fn(),
  checkDatabase: vi.fn(),
  checkObjectStorage: vi.fn(),
  checkWorker: vi.fn(),
};

function deepRequest(secret?: string) {
  const headers = new Headers();

  if (secret) headers.set("x-internal-secret", secret);

  return new NextRequest("http://localhost/api/health?deep=true", {
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkDatabase.mockResolvedValue({ rows: [] });
  mocks.checkObjectStorage.mockResolvedValue(undefined);
  mocks.checkWorker.mockResolvedValue(undefined);
});

describe("GET /api/health", () => {
  it("returns a healthy payload and echoes the request id", async () => {
    const request = new NextRequest("http://localhost/api/health", {
      headers: {
        "x-request-id": "health-test",
      },
    });

    const response = await handleHealthCheck(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("health-test");
    expect(body).toMatchObject({
      status: "ok",
      requestId: "health-test",
    });
  });

  it("rejects deep checks without the internal secret", async () => {
    mocks.authorizeInternalRequest.mockReturnValue(false);

    const response = await handleHealthCheck(deepRequest(), {
      ...healthCheckServices,
      ...mocks,
    });

    expect(response.status).toBe(401);
    expect(mocks.checkDatabase).not.toHaveBeenCalled();
  });

  it("reports 200 when the database and storage are reachable", async () => {
    mocks.authorizeInternalRequest.mockReturnValue(true);

    const response = await handleHealthCheck(deepRequest("secret"), {
      ...healthCheckServices,
      ...mocks,
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks).toEqual({
      database: "ok",
      storage: "ok",
      worker: "ok",
    });
  });

  it("reports 503 degraded when a dependency is unreachable", async () => {
    mocks.authorizeInternalRequest.mockReturnValue(true);
    mocks.checkDatabase.mockRejectedValue(new Error("down"));

    const response = await handleHealthCheck(deepRequest("secret"), {
      ...healthCheckServices,
      ...mocks,
    });

    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks).toEqual({
      database: "unreachable",
      storage: "ok",
      worker: "ok",
    });
  });
});
