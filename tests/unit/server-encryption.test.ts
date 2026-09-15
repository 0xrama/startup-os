import { afterEach, describe, expect, it, vi } from "vitest";
import {
  openText,
  sealText,
} from "@/infrastructure/security/server-encryption";

afterEach(() => vi.unstubAllEnvs());

describe("server encryption", () => {
  it("authenticates ciphertext and rejects the wrong key", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
    const sealed = sealText("synthetic private record");
    expect(sealed).not.toContain("synthetic");
    expect(openText(sealed)).toBe("synthetic private record");
    vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 2).toString("base64"));
    expect(() => openText(sealed)).toThrow();
  });

  it("fails closed without a key", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    expect(() => sealText("record")).toThrow();
    expect(() => openText("plaintext")).toThrow();
  });
});
