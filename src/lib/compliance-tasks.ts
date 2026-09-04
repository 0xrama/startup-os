import { db } from "./db";
import { complianceTasks } from "./schema";
import { buildSeedTaskMetadata } from "./compliance-task-details";

type LLCProfile = {
  id: string;
  state: string;
  entityType: string;
  ownerResidency: string | null;
  taxClassification: string | null;
  einStatus: string | null;
  formationDate: string | null;
  raRenewalDate: string | null;
  annualReportMonth: number | null;
  taxYearEnd: string | null;
};

type TaskSeed = {
  title: string;
  description: string;
  category: string;
  dueDate: string;
  recurring: boolean;
  recurrenceRule: string | null;
};

const ANNUAL_REPORT_STATES: Record<string, { month: number; label: string }> = {
  WY: { month: 0, label: "Due on the 1st day of the anniversary month" },
  NM: { month: 11, label: "Due within 30 days after anniversary" },
  FL: { month: 5, label: "Due May 1st annually" },
  DE: { month: 6, label: "Due June 1st annually" },
  TX: { month: 5, label: "Due May 15th annually (franchise tax)" },
  NV: { month: 0, label: "Due on the last day of the anniversary month" },
  CO: { month: 0, label: "Due in the anniversary month" },
};

function getCurrentTaxYear(): number {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

function nextDueDate(month: number, day: number): string {
  const now = new Date();
  const year = now.getFullYear();
  let due = new Date(year, month, day);
  if (due < now) {
    due = new Date(year + 1, month, day);
  }
  return due.toISOString().split("T")[0];
}

function getFormationMonth(formationDate: string | null): number {
  if (!formationDate) return 0;
  return new Date(formationDate).getMonth();
}

export function generateComplianceTasks(llc: LLCProfile): TaskSeed[] {
  const tasks: TaskSeed[] = [];
  const taxYear = getCurrentTaxYear();
  const isForeignOwned = llc.ownerResidency === "non_us";
  const isBasicCorporation =
    llc.entityType === "corporation" || llc.taxClassification === "c-corp";
  const isMultiMemberLlc = llc.entityType === "multi-member";
  const isSingleMemberLlc = llc.entityType === "single-member";

  // ─── Federal: Form 5472 + pro-forma 1120 ───────────────────
  // Required for foreign-owned disregarded entities
  if (
    isForeignOwned &&
    !isBasicCorporation &&
    (llc.taxClassification === "disregarded" || isSingleMemberLlc)
  ) {
    tasks.push({
      title: `File Form 5472 + pro-forma 1120 (${taxYear})`,
      description:
        "Foreign-owned single-member LLCs must file Form 5472 (Information Return of a 25% Foreign-Owned U.S. Corporation) attached to a pro-forma Form 1120. Reports reportable transactions between the LLC and its foreign owner.",
      category: "federal_tax",
      dueDate: nextDueDate(3, 15), // April 15
      recurring: true,
      recurrenceRule: "YEARLY",
    });
  }

  // ─── Federal: Partnership return (Form 1065) ───────────────
  if (
    !isBasicCorporation &&
    (llc.taxClassification === "partnership" || isMultiMemberLlc)
  ) {
    tasks.push({
      title: `File Form 1065 Partnership Return (${taxYear})`,
      description:
        "Multi-member LLCs taxed as partnerships must file Form 1065 and issue Schedule K-1 to each partner.",
      category: "federal_tax",
      dueDate: nextDueDate(2, 15), // March 15
      recurring: true,
      recurrenceRule: "YEARLY",
    });
  }

  // ─── Federal: Corporate return (Form 1120) ─────────────────
  if (isBasicCorporation) {
    tasks.push({
      title: `File Form 1120 Corporate Return (${taxYear})`,
      description:
        "Domestic corporations and entities taxed as C corporations generally file Form 1120 each year. Review whether estimated tax payments, state franchise taxes, or extensions also apply.",
      category: "federal_tax",
      dueDate: nextDueDate(3, 15), // April 15 for calendar-year corporations
      recurring: true,
      recurrenceRule: "YEARLY",
    });
  }

  // ─── Federal: FBAR (FinCEN 114) ────────────────────────────
  tasks.push({
    title: `FBAR Filing Deadline (${taxYear})`,
    description:
      "If your LLC has signature authority over foreign bank accounts exceeding $10,000 in aggregate, you may need to file FinCEN 114 (FBAR). Automatic extension to October 15.",
    category: "federal_tax",
    dueDate: nextDueDate(3, 15), // April 15 (auto-extended to Oct 15)
    recurring: true,
    recurrenceRule: "YEARLY",
  });

  // ─── EIN Application ──────────────────────────────────────
  if (llc.einStatus === "pending" || llc.einStatus === "not_needed") {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    tasks.push({
      title: "Apply for EIN (Employer Identification Number)",
      description:
        "Apply for an EIN using IRS Form SS-4. Non-resident applicants must apply by mail, fax, or phone (not online). Allow 4-6 weeks for processing by mail.",
      category: "federal_tax",
      dueDate: thirtyDays.toISOString().split("T")[0],
      recurring: false,
      recurrenceRule: null,
    });
  }

  // ─── State: Annual Report ─────────────────────────────────
  const stateInfo = ANNUAL_REPORT_STATES[llc.state];
  if (stateInfo) {
    const reportMonth =
      llc.annualReportMonth ??
      (stateInfo.month === 0 ? getFormationMonth(llc.formationDate) : stateInfo.month);

    tasks.push({
      title: `${llc.state} Annual Report / Franchise Tax`,
      description: `${stateInfo.label}. File with the ${llc.state} Secretary of State. Failure to file may result in administrative dissolution.`,
      category: "annual_report",
      dueDate: nextDueDate(reportMonth, 1),
      recurring: true,
      recurrenceRule: "YEARLY",
    });
  }

  // ─── Registered Agent Renewal ──────────────────────────────
  if (llc.raRenewalDate) {
    tasks.push({
      title: "Registered Agent Renewal",
      description:
        "Renew your registered agent service to maintain a valid address for service of process in your formation state.",
      category: "ra_renewal",
      dueDate: llc.raRenewalDate,
      recurring: true,
      recurrenceRule: "YEARLY",
    });
  }

  // ─── BOI Report (Beneficial Ownership Information) ─────────
  if (isForeignOwned && llc.formationDate) {
    const formed = new Date(llc.formationDate);
    const boiDeadline = new Date(formed);
    boiDeadline.setDate(boiDeadline.getDate() + 90);

    const now = new Date();
    if (boiDeadline > now) {
      tasks.push({
        title: "File BOI Report (Beneficial Ownership Information)",
        description:
          "Foreign reporting companies may need to file a Beneficial Ownership Information report with FinCEN. Confirm that your entity still falls within the current BOI rules before filing.",
        category: "boi_report",
        dueDate: boiDeadline.toISOString().split("T")[0],
        recurring: false,
        recurrenceRule: null,
      });
    }
  }

  return tasks;
}

export async function seedComplianceTasks(llcId: string, llc: LLCProfile) {
  const tasks = generateComplianceTasks(llc);

  if (tasks.length === 0) return [];

  const inserted = await db
    .insert(complianceTasks)
    .values(
      tasks.map((t) => ({
        llcId,
        title: t.title,
        description: t.description,
        category: t.category,
        dueDate: t.dueDate,
        recurring: t.recurring,
        recurrenceRule: t.recurrenceRule,
        source: "system" as const,
        metadata: buildSeedTaskMetadata({
          title: t.title,
          description: t.description,
          status: "upcoming",
        }),
      }))
    )
    .returning();

  return inserted;
}
