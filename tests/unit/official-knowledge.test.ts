import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
  vi.spyOn(getDb(), "insert").mockImplementation(mocks.insert);
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({
    onConflictDoUpdate: mocks.onConflictDoUpdate,
  });
});

describe("official knowledge initialization", () => {
  it("shares one batch between concurrent requests", async () => {
    mocks.onConflictDoUpdate.mockResolvedValue(undefined);
    const { seedOfficialKnowledge } = await import("@/lib/official-knowledge");
    await Promise.all([
      seedOfficialKnowledge(),
      seedOfficialKnowledge(),
      seedOfficialKnowledge(),
    ]);
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.values.mock.calls[0][0].length).toBeGreaterThan(1);
    expect(mocks.onConflictDoUpdate.mock.calls[0][0].setWhere).toBeDefined();
  });

  it("allows retries after a failed seed", async () => {
    mocks.onConflictDoUpdate
      .mockRejectedValueOnce(new Error("Database unavailable"))
      .mockResolvedValue(undefined);
    const { seedOfficialKnowledge } = await import("@/lib/official-knowledge");
    await expect(seedOfficialKnowledge()).rejects.toThrow();
    await seedOfficialKnowledge();
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });
});
