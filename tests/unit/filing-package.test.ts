import { describe, expect, it } from "vitest";
import {
  generateFilingPackage,
  resolvePackageType,
} from "../../src/lib/filing-package";
import {
  assessFederalTaxFiling,
  buildPreparationChecks,
  type TaxEntityProfile,
} from "../../src/lib/tax-copilot";

const foreignDeProfile: TaxEntityProfile = {
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
  formationDate: "2024-03-05",
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

const partnershipProfile: TaxEntityProfile = {
  ...foreignDeProfile,
  entityType: "multi-member",
  ownerResidency: "mixed",
  ownerCount: 2,
  foreignOwnerCount: 1,
  usOwnerCount: 1,
  taxClassification: "partnership",
  members: [
    {
      name: "Partner A",
      ownershipPct: 60,
      country: "Germany",
      taxIdType: "foreign",
      usTaxStatus: "foreign_person",
    },
    {
      name: "Partner B",
      ownershipPct: 40,
      country: "United States",
      taxIdType: "SSN",
      usTaxStatus: "us_person",
    },
  ],
};

describe("resolvePackageType", () => {
  it("maps the foreign-owned disregarded route to the 5472 package", () => {
    expect(resolvePackageType("foreign_owned_disregarded_entity")).toBe(
      "form_5472_proforma_1120"
    );
  });

  it("maps the partnership route to the 1065 package", () => {
    expect(resolvePackageType("partnership")).toBe("form_1065");
  });

  it("refuses to produce a federal package for a domestic disregarded entity", () => {
    expect(resolvePackageType("domestic_disregarded_entity")).toBeNull();
  });

  it("refuses to produce a package for unsupported scope", () => {
    expect(resolvePackageType("needs_review")).toBeNull();
  });
});

describe("generateFilingPackage", () => {
  it("builds a deterministic 5472 preparation package", () => {
    const assessment = assessFederalTaxFiling(foreignDeProfile, {
      taxYear: 2025,
    });

    const checks = buildPreparationChecks(foreignDeProfile, assessment);
    const generatedAt = new Date("2026-01-15T12:00:00.000Z");

    const first = generateFilingPackage({
      profile: foreignDeProfile,
      assessment,
      checks,
      packageType: "form_5472_proforma_1120",
      state: "WY",
      version: 3,
      generatedAt,
    });

    const second = generateFilingPackage({
      profile: foreignDeProfile,
      assessment,
      checks,
      packageType: "form_5472_proforma_1120",
      state: "WY",
      version: 3,
      generatedAt,
    });

    expect(first).toEqual(second);
    expect(first.fileName).toBe(
      "example-llc-form_5472_proforma_1120-2025-v3.md"
    );
    expect(first.markdown).toContain("not a filed return");
    expect(first.markdown).toContain("Part IV — Monetary transactions");
    expect(first.markdown).toContain("Part V — Formation, dissolution");
    expect(first.markdown).toContain("Part VI — Nonmonetary");
    expect(first.markdown).toContain("Pro forma Form 1120");
    expect(first.markdown).toContain("Pax does not transmit filings");
    expect(first.markdown).toContain("Foreign-owned U.S. DE");
    expect(first.markdown).toContain("Instructions for Form 5472");
    expect(first.markdown).toContain("Foreign person");
  });

  it("builds a 1065 organizer with partner and K-1 detail", () => {
    const assessment = assessFederalTaxFiling(partnershipProfile, {
      taxYear: 2025,
    });

    const checks = buildPreparationChecks(partnershipProfile, assessment);

    const generated = generateFilingPackage({
      profile: partnershipProfile,
      assessment,
      checks,
      packageType: "form_1065",
      state: "WY",
      version: 1,
    });

    expect(generated.markdown).toContain("Form 1065 organizer");
    expect(generated.markdown).toContain("Partner A");
    expect(generated.markdown).toContain("Partner B");
    expect(generated.markdown).toContain("Schedule K-1 to Partner A");
    expect(generated.markdown).toContain("section 1446 withholding");
    expect(generated.markdown).toContain("Form 7004");
    expect(generated.markdown).toContain("Ordinary business income");
    expect(generated.markdown).not.toContain("Part IV — Monetary transactions");
  });

  it("treats vault-encrypted owner lists honestly", () => {
    const assessment = assessFederalTaxFiling(foreignDeProfile, {
      taxYear: 2025,
    });

    const generated = generateFilingPackage({
      profile: { ...foreignDeProfile, members: [], ein: null },
      assessment,
      checks: [],
      packageType: "form_5472_proforma_1120",
      state: "WY",
      version: 1,
    });

    expect(generated.markdown).toContain("vault-encrypted");
    expect(generated.markdown).toContain("_fill from your EIN letter_");
  });
});
