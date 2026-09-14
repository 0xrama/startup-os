import { describe, expect, it } from "vitest";
import { assessLlcWellness, getEinFaxGuide } from "../../src/lib/llc-wellness";
import { createOperatingAgreementDraft } from "../../src/lib/operating-agreement";
import type { TaxEntityProfile } from "../../src/lib/tax-copilot";

const profile: TaxEntityProfile = {
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
  ein: null,
  einStatus: "pending",
  members: [
    {
      name: "Foreign Founder",
      ownershipPct: 100,
      country: "India",
      taxIdType: "foreign",
      usTaxStatus: "foreign_person",
    },
  ],
};

describe("assessLlcWellness", () => {
  it("flags a missing operating agreement, EIN, and activity answers", () => {
    const result = assessLlcWellness({
      profile,
      wellness: {},
      documents: [],
    });

    expect(result.status).toBe("incomplete");
    expect(
      result.checks.find((check) => check.id === "operating-agreement")?.status
    ).toBe("action_needed");
    expect(result.checks.find((check) => check.id === "ein")?.status).toBe(
      "action_needed"
    );
  });

  it("adds operational checks when the LLC is active", () => {
    const result = assessLlcWellness({
      profile: { ...profile, ein: "12-3456789", einStatus: "received" },
      wellness: {
        businessStatus: "active",
        engagedInUSTradeOrBusiness: "yes",
        hasEmployees: true,
        usesContractors: true,
        makesTaxableSales: true,
        operatesOutsideFormationState: true,
        hasUSBankAccount: true,
        bookkeepingCurrent: true,
      },
      documents: [
        { name: "Operating Agreement.pdf", category: "operating_agreement" },
      ],
      tasks: [
        {
          title: "Wyoming annual report",
          dueDate: "2099-01-01",
          status: "upcoming",
        },
      ],
    });

    expect(
      result.checks.find((check) => check.id === "employees")?.status
    ).toBe("review");
    expect(
      result.checks.find((check) => check.id === "sales-tax")?.status
    ).toBe("review");
    expect(
      result.checks.find((check) => check.id === "compliance-calendar")?.status
    ).toBe("healthy");
  });
});

describe("getEinFaxGuide", () => {
  it("uses the international fax path for an outside-U.S. principal place", () => {
    const guide = getEinFaxGuide({
      profile,
      principalPlaceOfBusiness: "outside_us",
    });

    expect(guide.faxNumbers.join(" ")).toContain("304-707-9471");
    expect(guide.steps.join(" ")).toContain(
      "Foreign-owned U.S. disregarded entity-Form 5472"
    );
  });

  it("uses the domestic fax number for a U.S. principal place", () => {
    const guide = getEinFaxGuide({
      profile,
      principalPlaceOfBusiness: "us",
    });

    expect(guide.faxNumbers.join(" ")).toContain("855-641-6935");
  });
});

describe("createOperatingAgreementDraft", () => {
  it("creates a populated single-member starter agreement", () => {
    const draft = createOperatingAgreementDraft({
      name: profile.name,
      state: "WY",
      formationDate: profile.formationDate ?? null,
      entityType: profile.entityType,
      taxClassification: profile.taxClassification,
      members: profile.members ?? [],
      businessPurpose: "provide software consulting services",
    });

    expect(draft).toContain("OPERATING AGREEMENT OF EXAMPLE LLC");
    expect(draft).toContain("Foreign Founder, 100% membership interest");
    expect(draft).toContain("provide software consulting services");
    expect(draft).toContain("review with a licensed attorney in WY");
  });
});
