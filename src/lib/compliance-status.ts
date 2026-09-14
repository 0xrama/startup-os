import type { FilingAssessment, PreparationCheck } from "./tax-copilot";

/**
 * The four honest states Pax can claim about an entity. A numeric score would
 * imply more precision than the underlying facts support, so every status is
 * paired with the reasons that produced it.
 */
export type ComplianceStatusLevel =
  | "ready"
  | "action_required"
  | "waiting_for_information"
  | "outside_supported_scope";

const LEVEL_ORDER: ComplianceStatusLevel[] = [
  "outside_supported_scope",
  "waiting_for_information",
  "action_required",
  "ready",
];

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatusLevel, string> = {
  ready: "Ready",
  action_required: "Action required",
  waiting_for_information: "Waiting for information",
  outside_supported_scope: "Outside supported scope",
};

export type ComplianceStatusReason = {
  detail: string;
  source: string;
};

export type ComplianceTaskSummary = {
  title: string;
  dueDate: string;
  status: string | null;
  category: string | null;
  source: string | null;
};

export type ComplianceNoticeSummary = {
  id: string;
  status: string | null;
  responseDueDate: string | null;
  issuer: string | null;
};

export type WyomingCardState =
  | { applicable: false }
  | {
      applicable: true;
      reminderEnabled: boolean;
      status: ComplianceStatusLevel;
      nextDueDate: string | null;
      reasons: ComplianceStatusReason[];
    };

export type ComplianceStatusReport = {
  overall: ComplianceStatusLevel;
  federal: {
    status: ComplianceStatusLevel;
    route: FilingAssessment["route"];
    taxYear: number;
    dueDate: string | null;
    nextTaskTitle: string | null;
    nextTaskDueDate: string | null;
    reasons: ComplianceStatusReason[];
  };
  wyoming: WyomingCardState;
};

const DUE_SOON_WINDOW_DAYS = 14;

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function daysBetween(from: Date, to: string) {
  return Math.round(
    (toUtcDate(to).getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
  );
}

function worstLevel(levels: ComplianceStatusLevel[]) {
  return LEVEL_ORDER.find((level) => levels.includes(level)) ?? "ready";
}

function isTaskOpen(task: ComplianceTaskSummary) {
  return task.status !== "completed" && task.status !== "hidden";
}

/**
 * Computes the cockpit status from facts Pax already holds. The function is
 * pure so the same inputs always produce the same status, and every reason
 * names where the fact came from.
 */
export function computeComplianceStatus(input: {
  assessment: FilingAssessment;
  checks: PreparationCheck[];
  tasks: ComplianceTaskSummary[];
  notices: ComplianceNoticeSummary[];
  state: string;
  formationDate: string | null;
  wyAnnualFeeReminderEnabled: boolean | null | undefined;
  now?: Date;
}): ComplianceStatusReport {
  const now = input.now ?? new Date();
  const today = now.toISOString().slice(0, 10);

  const openTasks = input.tasks.filter(isTaskOpen);

  const federalTasks = openTasks.filter(
    (task) => task.category === "federal_tax"
  );

  const nextFederalTask = [...federalTasks].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  )[0];

  const federalReasons: ComplianceStatusReason[] = [];

  if (input.assessment.route === "needs_review") {
    for (const reason of input.assessment.reasons) {
      federalReasons.push({
        detail: reason,
        source: "Saved ownership profile",
      });
    }
  }

  for (const check of input.checks) {
    if (check.status === "action_needed") {
      federalReasons.push({
        detail: check.detail,
        source: "Profile readiness check",
      });
    }
  }

  const overdueTasks = openTasks.filter((task) => task.dueDate < today);

  const dueSoonTasks = openTasks.filter((task) => {
    const delta = daysBetween(now, task.dueDate);

    return delta >= 0 && delta <= DUE_SOON_WINDOW_DAYS;
  });

  for (const task of overdueTasks) {
    federalReasons.push({
      detail: `${task.title} was due ${task.dueDate}.`,
      source: "Compliance calendar",
    });
  }

  for (const task of dueSoonTasks) {
    federalReasons.push({
      detail: `${task.title} is due ${task.dueDate}.`,
      source: "Compliance calendar",
    });
  }

  const awaitingNotices = input.notices.filter(
    (notice) => notice.status === "processing" || notice.status === "ready"
  );

  const confirmedNoticesWithDeadline = input.notices.filter(
    (notice) =>
      notice.status === "confirmed" &&
      notice.responseDueDate &&
      notice.responseDueDate < today
  );

  for (const notice of awaitingNotices) {
    federalReasons.push({
      detail: `Confirm or dismiss the notice from ${
        notice.issuer ?? "the agency"
      } so Pax can act on it.`,
      source: "Notice inbox",
    });
  }

  for (const notice of confirmedNoticesWithDeadline) {
    federalReasons.push({
      detail: `The confirmed notice from ${
        notice.issuer ?? "the agency"
      } passed its response date of ${notice.responseDueDate}.`,
      source: "Notice inbox",
    });
  }

  const federalStatus: ComplianceStatusLevel =
    input.assessment.route === "needs_review"
      ? "outside_supported_scope"
      : awaitingNotices.length > 0 ||
          input.checks.some((check) => check.status === "action_needed")
        ? "waiting_for_information"
        : overdueTasks.length > 0 || dueSoonTasks.length > 0
          ? "action_required"
          : "ready";

  const wyoming = buildWyomingCard(input, now, today);

  const overall = worstLevel([
    federalStatus,
    wyoming.applicable ? wyoming.status : "ready",
  ]);

  return {
    overall,
    federal: {
      status: federalStatus,
      route: input.assessment.route,
      taxYear: input.assessment.taxYear,
      dueDate: input.assessment.dueDate,
      nextTaskTitle: nextFederalTask?.title ?? null,
      nextTaskDueDate: nextFederalTask?.dueDate ?? null,
      reasons: federalReasons,
    },
    wyoming,
  };
}

function buildWyomingCard(
  input: Parameters<typeof computeComplianceStatus>[0],
  now: Date,
  today: string
): WyomingCardState {
  if (input.state !== "WY") {
    return { applicable: false };
  }

  const reminderEnabled = input.wyAnnualFeeReminderEnabled === true;

  if (!reminderEnabled) {
    return {
      applicable: true,
      reminderEnabled: false,
      status: "ready",
      nextDueDate: null,
      reasons: [
        {
          detail:
            "The optional Wyoming annual report license tax reminder is off. Enable it to track the anniversary-month deadline.",
          source: "Reminder preferences",
        },
      ],
    };
  }

  if (!input.formationDate) {
    return {
      applicable: true,
      reminderEnabled: true,
      status: "waiting_for_information",
      nextDueDate: null,
      reasons: [
        {
          detail:
            "The reminder is on, but the formation date is missing. Pax needs it to place the anniversary-month deadline.",
          source: "Saved profile",
        },
      ],
    };
  }

  const formation = new Date(`${input.formationDate}T00:00:00.000Z`);

  if (Number.isNaN(formation.getTime())) {
    return {
      applicable: true,
      reminderEnabled: true,
      status: "waiting_for_information",
      nextDueDate: null,
      reasons: [
        {
          detail: `The saved formation date ${input.formationDate} could not be read.`,
          source: "Saved profile",
        },
      ],
    };
  }

  // Wyoming license tax is due on the first day of the anniversary month, so
  // the next occurrence uses the formation month and day one.
  const anniversaryMonth = formation.getUTCMonth();
  const current = new Date(Date.UTC(now.getUTCFullYear(), anniversaryMonth, 1));

  const nextOccurrence =
    toUtcDate(today) > current
      ? new Date(Date.UTC(now.getUTCFullYear() + 1, anniversaryMonth, 1))
      : current;

  const nextDueDate = nextOccurrence.toISOString().slice(0, 10);

  const reasons: ComplianceStatusReason[] = [
    {
      detail: `Wyoming annual report license tax falls due on the first day of the anniversary month. Next date: ${nextDueDate}.`,
      source: "Wyoming anniversary-month rule",
    },
  ];

  const wyomingTask = input.tasks.find(
    (task) =>
      isTaskOpen(task) &&
      task.category === "annual_report" &&
      task.title.includes("Wyoming")
  );

  if (wyomingTask) {
    reasons.push({
      detail: `Tracked task: ${wyomingTask.title}, due ${wyomingTask.dueDate}.`,
      source: "Compliance calendar",
    });
  }

  const status: ComplianceStatusLevel =
    nextDueDate < today
      ? "action_required"
      : daysBetween(now, nextDueDate) <= DUE_SOON_WINDOW_DAYS
        ? "action_required"
        : "ready";

  return {
    applicable: true,
    reminderEnabled: true,
    status,
    nextDueDate,
    reasons,
  };
}
