import { describe, expect, it } from "vitest";
import { getPlanLimits } from "../../src/lib/plan-limits";

describe("getPlanLimits", () => {
  it("returns starter limits", () => {
    expect(getPlanLimits("starter")).toMatchObject({
      maxLlcs: 1,
      maxDocuments: 25,
      maxAssistantQueries: 10,
    });
  });

  it("returns unrestricted values for pro", () => {
    expect(getPlanLimits("pro")).toMatchObject({
      whatsappReminders: true,
      collaborators: true,
    });
  });

  it("falls back to the anonymous plan", () => {
    expect(getPlanLimits(null)).toMatchObject({
      maxLlcs: 0,
      maxDocuments: 0,
      maxAssistantQueries: 0,
    });
  });
});
