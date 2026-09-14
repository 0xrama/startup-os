import { describe, expect, it } from "vitest";
import {
  computeComplianceStatus,
  type ComplianceNoticeSummary,
  type ComplianceTaskSummary,
} from "../../src/lib/compliance-status";
import {
  assessFederalTaxFiling,
  buildPreparationChecks,
  type PreparationCheck,
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

const farFutureTask: ComplianceTaskSummary = {
  title: "Form 5472 review (2025)",
  dueDate: "2099-04-15",
  status: "upcoming",
  category: "federal_tax",
  source: "system",
};

const completeChecks: PreparationCheck[] = [
  {
    id: "ein",
    label: "EIN available",
    status: "complete",
    detail: "The profile indicates that an EIN is available.",
  },
];

function buildInput(overrides?: {
  profile?: Partial<TaxEntityProfile>;
  tasks?: ComplianceTaskSummary[];
  notices?: ComplianceNoticeSummary[];
  checks?: PreparationCheck[];
  state?: string;
  formationDate?: string | null;
  wyAnnualFeeReminderEnabled?: boolean;
  now?: Date;
}) {
  const profile = { ...baseProfile, ...overrides?.profile };
  const assessment = assessFederalTaxFiling(profile, { taxYear: 2025 });

  const checks =
    overrides?.checks ?? buildPreparationChecks(profile, assessment);

  return {
    assessment,
    checks,
    tasks: overrides?.tasks ?? [farFutureTask],
    notices: overrides?.notices ?? [],
    state: overrides?.state ?? "WY",
    formationDate:
      overrides?.formationDate === undefined
        ? "2024-03-05"
        : overrides.formationDate,
    wyAnnualFeeReminderEnabled: overrides?.wyAnnualFeeReminderEnabled ?? false,
    now: overrides?.now ?? new Date("2026-01-15T12:00:00.000Z"),
  };
}

function reasonText(reasons: { detail: string }[]) {
  return reasons.map((reason) => reason.detail).join(" ");
}

describe("computeComplianceStatus", () => {
  it("marks legacy unconfirmed ownership as outside the supported scope", () => {
    const input = buildInput({
      profile: {
        ownersAreIndividuals: null,
        ownershipIsDirect: null,
      },
    });

    const report = computeComplianceStatus(input);

    expect(report.overall).toBe("outside_supported_scope");
    expect(report.federal.status).toBe("outside_supported_scope");
    expect(reasonText(report.federal.reasons)).toContain("Confirm");
  });

  it("waits for information while readiness checks are incomplete", () => {
    const report = computeComplianceStatus(buildInput());

    expect(report.federal.status).toBe("waiting_for_information");
    expect(report.overall).toBe("waiting_for_information");
    expect(report.federal.reasons.length).toBeGreaterThan(0);
  });

  it("surfaces overdue tasks as action required", () => {
    const report = computeComplianceStatus(
      buildInput({
        checks: completeChecks,
        tasks: [
          {
            title: "Form 5472 review (2024)",
            dueDate: "2025-04-15",
            status: "upcoming",
            category: "federal_tax",
            source: "system",
          },
        ],
      })
    );

    expect(report.federal.status).toBe("action_required");
    expect(report.overall).toBe("action_required");
    expect(reasonText(report.federal.reasons)).toContain("was due 2025-04-15");
  });

  it("reports ready when facts are complete and nothing is due soon", () => {
    const report = computeComplianceStatus(
      buildInput({
        checks: completeChecks,
        tasks: [farFutureTask],
      })
    );

    expect(report.federal.status).toBe("ready");
    expect(report.overall).toBe("ready");
  });

  it("waits on extracted notices until the user confirms them", () => {
    const report = computeComplianceStatus(
      buildInput({
        checks: completeChecks,
        notices: [
          {
            id: "notice-1",
            status: "ready",
            responseDueDate: "2099-06-01",
            issuer: "IRS",
          },
        ],
      })
    );

    expect(report.overall).toBe("waiting_for_information");
    expect(reasonText(report.federal.reasons)).toContain("IRS");
  });

  it("flags a confirmed notice whose response date passed", () => {
    const report = computeComplianceStatus(
      buildInput({
        checks: completeChecks,
        notices: [
          {
            id: "notice-2",
            status: "confirmed",
            responseDueDate: "2025-06-01",
            issuer: "IRS",
          },
        ],
      })
    );

    expect(reasonText(report.federal.reasons)).toContain(
      "passed its response date"
    );
  });
});

describe("computeComplianceStatus Wyoming card", () => {
  it("is not applicable outside Wyoming", () => {
    const report = computeComplianceStatus(buildInput({ state: "DE" }));

    expect(report.wyoming.applicable).toBe(false);
    expect(report.overall).toBe(report.federal.status);
  });

  it("stays informational while the reminder is off", () => {
    const report = computeComplianceStatus(
      buildInput({ wyAnnualFeeReminderEnabled: false })
    );

    expect(report.wyoming).toMatchObject({
      applicable: true,
      reminderEnabled: false,
      status: "ready",
      nextDueDate: null,
    });
  });

  it("waits for a formation date when the reminder is on", () => {
    const report = computeComplianceStatus(
      buildInput({ wyAnnualFeeReminderEnabled: true, formationDate: null })
    );

    expect(report.wyoming).toMatchObject({
      applicable: true,
      reminderEnabled: true,
      status: "waiting_for_information",
      nextDueDate: null,
    });
  });

  it("computes the next anniversary due date", () => {
    const report = computeComplianceStatus(
      buildInput({ wyAnnualFeeReminderEnabled: true })
    );

    expect(report.wyoming.applicable).toBe(true);

    if (!report.wyoming.applicable) return;

    // Anniversary month is March; 2026-03-01 is after 2026-01-15.
    expect(report.wyoming.nextDueDate).toBe("2026-03-01");
  });

  it("rolls to next year after the anniversary date passed", () => {
    const report = computeComplianceStatus(
      buildInput({
        wyAnnualFeeReminderEnabled: true,
        now: new Date("2026-04-10T12:00:00.000Z"),
      })
    );

    if (!report.wyoming.applicable) throw new Error("Wyoming card missing");

    expect(report.wyoming.nextDueDate).toBe("2027-03-01");
    expect(report.wyoming.status).toBe("ready");
  });
});
