import { describe, expect, it } from "vitest";
import {
  assessFederalTaxFiling,
  buildPreparationChecks,
  classify5472Transaction,
  type TaxEntityProfile,
} from "../../src/lib/tax-copilot";

const baseProfile: TaxEntityProfile = {
  id: "llc-1",
  name: "Example LLC",
  entityType: "single-member",
  ownerResidency: "non_us",
  ownersAreIndividuals: true,
  ownershipIsDirect: true,
  ownerCount: 1,
  foreignOwnerCount: 1,
  usOwnerCount: 0,
  taxClassification: "disregarded",
  taxYearEnd: "12-31",
  formationDate: "2025-01-10",
  ein: "12-3456789",
  einStatus: "received",
  members: [
    {
      name: "Owner",
      ownershipPct: 100,
      country: "Germany",
      taxIdType: "foreign",
      usTaxStatus: "foreign_person",
    },
  ],
};

describe("assessFederalTaxFiling", () => {
  it("routes a foreign-owned disregarded LLC to Form 5472 and pro forma 1120", () => {
    const result = assessFederalTaxFiling(baseProfile, { taxYear: 2025 });

    expect(result.route).toBe("foreign_owned_disregarded_entity");
    expect(result.forms).toEqual(["Form 5472", "Pro forma Form 1120"]);
    expect(result.dueDate).toBe("2026-04-15");
    expect(result.filingMethod).toContain("Electronic filing is not available");
  });

  it("routes a multi-member LLC to Form 1065, not Form 5471", () => {
    const result = assessFederalTaxFiling(
      {
        ...baseProfile,
        entityType: "multi-member",
        taxClassification: "partnership",
        members: [
          { ...baseProfile.members![0], ownershipPct: 60 },
          {
            name: "Second owner",
            ownershipPct: 40,
            country: "India",
            taxIdType: "foreign",
            usTaxStatus: "foreign_person",
          },
        ],
      },
      { taxYear: 2025 }
    );

    expect(result.route).toBe("partnership");
    expect(result.forms).toContain("Form 1065");
    expect(result.forms.join(" ")).not.toContain("5471");
    expect(result.warnings.join(" ")).toContain("Form 5471 is not the default");
    expect(result.dueDate).toBe("2026-03-16");
  });

  it("routes C-corporation treatment to review", () => {
    const result = assessFederalTaxFiling(
      { ...baseProfile, taxClassification: "c-corp" },
      { taxYear: 2025 }
    );

    expect(result.route).toBe("needs_review");
    expect(result.forms).toEqual([]);
    expect(result.reasons.join(" ")).toContain("disregarded");
  });

  it("routes S-corporation treatment to review", () => {
    const result = assessFederalTaxFiling(
      { ...baseProfile, taxClassification: "s-corp" },
      { taxYear: 2025 }
    );

    expect(result.route).toBe("needs_review");
    expect(result.summary).toContain("outside Pax's supported filing scope");
  });

  it("requires ownership confirmation for legacy profiles", () => {
    const result = assessFederalTaxFiling(
      {
        ...baseProfile,
        ownersAreIndividuals: null,
        ownershipIsDirect: null,
      },
      { taxYear: 2025 }
    );

    expect(result.route).toBe("needs_review");
    expect(result.reasons.join(" ")).toContain("Confirm");
  });
});

describe("buildPreparationChecks", () => {
  it("uses saved owner and EIN information", () => {
    const checks = buildPreparationChecks(baseProfile);

    expect(checks.find((check) => check.id === "ein")?.status).toBe("complete");
    expect(checks.find((check) => check.id === "owner")?.status).toBe(
      "complete"
    );
    expect(checks.find((check) => check.id === "transactions")?.status).toBe(
      "action_needed"
    );
  });
});

describe("classify5472Transaction", () => {
  it("maps an owner contribution to Part V", () => {
    const result = classify5472Transaction({
      description: "The foreign owner made a capital contribution",
      direction: "received",
    });

    expect(result.part).toBe("V");
    expect(result.requiresStatement).toBe(true);
  });

  it("maps services paid to a foreign related party to line 29", () => {
    const result = classify5472Transaction({
      description: "Management services paid to the foreign owner",
      direction: "paid",
    });

    expect(result.part).toBe("IV");
    expect(result.line).toBe("29");
  });

  it("maps below-market transfers to Part VI", () => {
    const result = classify5472Transaction({
      description: "Equipment transferred below market value",
      direction: "paid",
    });

    expect(result.part).toBe("VI");
  });

  it("requires review for owner-paid expenses", () => {
    const result = classify5472Transaction({
      description: "The owner paid the LLC software bill personally",
      direction: "received",
    });

    expect(result.part).toBe("review");
    expect(result.confidence).toBe("review");
  });
});
