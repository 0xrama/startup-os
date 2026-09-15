import { describe, expect, it } from "vitest";
import { generateComplianceTasks } from "../../src/lib/compliance-tasks";

const baseProfile: Parameters<typeof generateComplianceTasks>[0] = {
  id: "llc-1",
  state: "WY",
  entityType: "single-member",
  ownerResidency: "non_us",
  ownersAreIndividuals: true,
  ownershipIsDirect: true,
  ownerCount: 1,
  foreignOwnerCount: 1,
  usOwnerCount: 0,
  taxClassification: "disregarded",
  einStatus: "received",
  formationDate: "2025-01-10",
  raRenewalDate: null,
  annualReportMonth: null,
  taxYearEnd: "12-31",
  filingPreferences: {
    remindDaysBefore: 30,
    channels: ["email"],
    wyAnnualFeeReminderEnabled: false,
  },
};

function federalTitles(profile: Parameters<typeof generateComplianceTasks>[0]) {
  return generateComplianceTasks(profile)
    .filter((task) => task.category === "federal_tax")
    .map((task) => task.title);
}

describe("generateComplianceTasks federal routing", () => {
  it("does not seed filing years before formation", () => {
    const tasks = generateComplianceTasks(
      { ...baseProfile, formationDate: "2026-02-01" },
      new Date("2026-02-10T00:00:00Z")
    );

    expect(tasks.some((task) => task.title.includes("(2025)"))).toBe(false);
    expect(tasks.find((task) => task.title.includes("5472"))?.dueDate).toBe(
      "2027-04-15"
    );
  });
  it("creates the Form 5472 review only for a foreign-owned disregarded entity", () => {
    const titles = federalTitles(baseProfile);

    expect(titles.some((title) => title.includes("Form 5472"))).toBe(true);
    expect(titles.some((title) => title.includes("Form 1065"))).toBe(false);
  });

  it("routes partnership classification to Form 1065", () => {
    const titles = federalTitles({
      ...baseProfile,
      entityType: "multi-member",
      taxClassification: "partnership",
      ownerCount: 2,
      foreignOwnerCount: 2,
    });

    expect(titles.some((title) => title.includes("Form 1065"))).toBe(true);
    expect(titles.some((title) => title.includes("Form 5472"))).toBe(false);
  });

  it("does not create an automated S-corporation task", () => {
    const titles = federalTitles({
      ...baseProfile,
      taxClassification: "s-corp",
    });

    expect(titles.some((title) => title.includes("1120-S"))).toBe(false);
    expect(titles.some((title) => title.includes("Form 5472"))).toBe(false);
  });

  it("does not create an automated C-corporation task", () => {
    const titles = federalTitles({
      ...baseProfile,
      taxClassification: "c-corp",
    });

    expect(titles.some((title) => title.includes("Form 1120"))).toBe(false);
    expect(titles.some((title) => title.includes("Form 1065"))).toBe(false);
  });
});

describe("generateComplianceTasks Wyoming reminder", () => {
  it("creates the Wyoming annual fee reminder only when enabled", () => {
    const tasks = generateComplianceTasks({
      ...baseProfile,
      filingPreferences: {
        remindDaysBefore: 30,
        channels: ["email"],
        wyAnnualFeeReminderEnabled: true,
      },
    });

    expect(
      tasks.some((task) =>
        task.title.includes("Wyoming annual report and license tax")
      )
    ).toBe(true);
  });

  it("does not create state tasks outside Wyoming", () => {
    const tasks = generateComplianceTasks({
      ...baseProfile,
      state: "DE",
      filingPreferences: {
        remindDaysBefore: 30,
        channels: ["email"],
        wyAnnualFeeReminderEnabled: false,
      },
    });

    expect(tasks.some((task) => task.category === "annual_report")).toBe(false);
  });
});
