import { describe, expect, it } from "vitest";
import { assessOwnershipScope } from "../../src/lib/ownership-scope";

const foreignSingleMember = {
  entityType: "single-member",
  taxClassification: "disregarded",
  ownerResidency: "non_us",
  ownersAreIndividuals: true,
  ownershipIsDirect: true,
  members: [
    {
      ownershipPct: 100,
      usTaxStatus: "foreign_person" as const,
    },
  ],
};

describe("assessOwnershipScope", () => {
  it("supports a direct foreign individual owner", () => {
    expect(assessOwnershipScope(foreignSingleMember)).toEqual({
      supported: true,
      route: "foreign_owned_disregarded_entity",
      reasons: [],
    });
  });

  it("supports direct individual partners with mixed tax statuses", () => {
    const result = assessOwnershipScope({
      ...foreignSingleMember,
      entityType: "multi-member",
      taxClassification: "partnership",
      members: [
        { ownershipPct: 60, usTaxStatus: "foreign_person" },
        { ownershipPct: 40, usTaxStatus: "us_person" },
      ],
    });

    expect(result.supported).toBe(true);
    expect(result.route).toBe("partnership");
  });

  it("rejects entity and indirect ownership", () => {
    const result = assessOwnershipScope({
      ...foreignSingleMember,
      ownersAreIndividuals: false,
      ownershipIsDirect: false,
    });

    expect(result.supported).toBe(false);
    expect(result.reasons.join(" ")).toContain("companies");
    expect(result.reasons.join(" ")).toContain("indirect");
  });

  it("requires legacy profiles to confirm ownership", () => {
    const result = assessOwnershipScope({
      ...foreignSingleMember,
      ownersAreIndividuals: null,
      ownershipIsDirect: null,
      members: [
        {
          ownershipPct: 100,
        },
      ],
    });

    expect(result.supported).toBe(false);
    expect(result.reasons.join(" ")).toContain("Confirm");
    expect(result.reasons.join(" ")).toContain("U.S. person or foreign person");
  });

  it("rejects corporate tax elections", () => {
    const result = assessOwnershipScope({
      ...foreignSingleMember,
      taxClassification: "c-corp",
    });

    expect(result.supported).toBe(false);
    expect(result.reasons.join(" ")).toContain("disregarded");
  });
});
