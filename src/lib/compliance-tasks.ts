import { db } from "./db";
import { complianceTasks, llcs } from "./schema";
import { eq } from "drizzle-orm";
import { buildSeedTaskMetadata } from "./compliance-task-details";
import { assessFederalTaxFiling, currentFilingTaxYear } from "./tax-copilot";
import { calendarYearFilingDeadline } from "@/modules/compliance/deadlines";
import { scheduleTaskReminders } from "@/modules/notifications/reminders";

type LLCProfile = {
  id: string;
  state: string;
  entityType: string;
  ownerResidency: string | null;
  ownersAreIndividuals: boolean | null;
  ownershipIsDirect: boolean | null;
  ownerCount: number | null;
  foreignOwnerCount: number | null;
  usOwnerCount: number | null;
  taxClassification: string | null;
  einStatus: string | null;
  formationDate: string | null;
  raRenewalDate: string | null;
  annualReportMonth: number | null;
  taxYearEnd: string | null;
  filingPreferences: {
    remindDaysBefore: number;
    channels: ("email" | "whatsapp")[];
    wyAnnualFeeReminderEnabled?: boolean;
  } | null;
};

type TaskSeed = {
  title: string;
  description: string;
  category: string;
  dueDate: string;
  recurring: boolean;
  recurrenceRule: string | null;
};

function nextDueDate(month: number, day: number, now: Date): string {
  const year = now.getUTCFullYear();
  let due = new Date(Date.UTC(year, month, day));

  if (due.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)) {
    due = new Date(Date.UTC(year + 1, month, day));
  }

  return due.toISOString().split("T")[0];
}

function getFormationMonth(formationDate: string | null): number {
  if (!formationDate) return 0;

  return new Date(formationDate).getUTCMonth();
}

export function generateComplianceTasks(
  llc: LLCProfile,
  now = new Date()
): TaskSeed[] {
  const tasks: TaskSeed[] = [];
  const taxYear = Math.max(
    currentFilingTaxYear(now),
    Number(llc.formationDate?.slice(0, 4)) || 0
  );
  const scope = assessFederalTaxFiling({ ...llc, name: "" }, { taxYear });

  // ─── Federal: Form 5472 + pro-forma 1120 ───────────────────
  // Required for foreign-owned disregarded entities
  if (scope.route === "foreign_owned_disregarded_entity") {
    tasks.push({
      title: `Review and file Form 5472 + pro-forma 1120 (${taxYear})`,
      description:
        "A foreign-owned U.S. disregarded entity generally files Form 5472 attached to a pro-forma Form 1120 when it had a reportable owner or related-party transaction. Formation, contributions, distributions, loans, and owner-paid expenses can be reportable.",
      category: "federal_tax",
      dueDate: scope.dueDate!,
      recurring: true,
      recurrenceRule: "YEARLY",
    });
  }

  // ─── Federal: Partnership return (Form 1065) ───────────────
  if (scope.route === "partnership") {
    tasks.push({
      title: `File Form 1065 Partnership Return (${taxYear})`,
      description:
        "Multi-member LLCs taxed as partnerships must file Form 1065 and issue Schedule K-1 to each partner.",
      category: "federal_tax",
      dueDate: scope.dueDate!,
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
    dueDate: calendarYearFilingDeadline(taxYear, 4),
    recurring: true,
    recurrenceRule: "YEARLY",
  });

  // ─── EIN Application ──────────────────────────────────────
  if (llc.einStatus === "pending" || llc.einStatus === "not_needed") {
    const thirtyDays = new Date(now);
    thirtyDays.setUTCDate(thirtyDays.getUTCDate() + 30);
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

  // ─── Wyoming: annual report and license tax reminder ──────
  if (
    llc.state === "WY" &&
    llc.filingPreferences?.wyAnnualFeeReminderEnabled === true &&
    llc.formationDate
  ) {
    const reportMonth = getFormationMonth(llc.formationDate);
    tasks.push({
      title: "Wyoming annual report and license tax reminder",
      description:
        "Review and pay the Wyoming annual report license tax. It is generally due on the first day of the LLC's anniversary month. Pax provides a reminder only and does not submit the state filing.",
      category: "annual_report",
      dueDate: nextDueDate(reportMonth, 1, now),
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

  // Foreign ownership alone does not make a domestic LLC a foreign reporting company.

  return tasks;
}

type ComplianceTaskWriter = Pick<typeof db, "insert" | "select">;

export async function seedComplianceTasks(
  llcId: string,
  llc: LLCProfile,
  database: ComplianceTaskWriter = db
): Promise<(typeof complianceTasks.$inferSelect)[]> {
  if (database === db)
    return db.transaction((tx) => seedComplianceTasks(llcId, llc, tx));
  const tasks = generateComplianceTasks(llc);

  if (tasks.length === 0) return [];

  const inserted = await database
    .insert(complianceTasks)
    .values(
      tasks.map((t) => ({
        id: `seed:${llcId}:${t.title}:${t.dueDate}`,
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
    .onConflictDoNothing()
    .returning();

  const [owner] = await database
    .select({ userId: llcs.userId })
    .from(llcs)
    .where(eq(llcs.id, llcId));

  if (owner)
    await scheduleTaskReminders(
      inserted.map((task) => task.id),
      owner.userId,
      database
    );

  return inserted;
}
