import { llcs, complianceTasks } from "./schema";

export type ComplianceTaskRecord = typeof complianceTasks.$inferSelect;
export type LlcRecord = typeof llcs.$inferSelect;

export type TaskChecklistItem = {
  id: string;
  label: string;
  done?: boolean;
};

export type ComplianceTaskMetadata = {
  filingCode?: string;
  filingYear?: number;
  optional?: boolean;
  applicable?: boolean;
  optionalPrompt?: string;
  checklist?: TaskChecklistItem[];
  filing?: {
    filedAt?: string | null;
    filedMethod?:
      | "fax"
      | "mail"
      | "online"
      | "e-file"
      | "phone"
      | "manual"
      | "other"
      | null;
    acknowledgementStatus?: "received" | "pending" | "not_available" | null;
    acknowledgementReference?: string | null;
    notes?: string | null;
  };
};

export type DerivedTaskState =
  | "completed"
  | "overdue"
  | "due_soon"
  | "upcoming"
  | "hidden";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function mergeChecklist(
  defaults: TaskChecklistItem[] | undefined,
  overrides: TaskChecklistItem[] | undefined
) {
  if (!defaults?.length) return overrides ?? [];
  if (!overrides?.length) return defaults;

  const overrideMap = new Map(overrides.map((item) => [item.id, item]));
  const merged = defaults.map((item) => ({
    ...item,
    ...overrideMap.get(item.id),
  }));
  const extraItems = overrides.filter(
    (item) => !defaults.some((base) => base.id === item.id)
  );
  return [...merged, ...extraItems];
}

function checklist(items: string[]) {
  return items.map((label) => ({
    id: label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    label,
    done: false,
  }));
}

function inferTaskMetadata(
  task: Pick<ComplianceTaskRecord, "title" | "description" | "status">
): ComplianceTaskMetadata {
  const lowerTitle = task.title.toLowerCase();

  if (lowerTitle.includes("5472") && lowerTitle.includes("1120")) {
    return {
      filingCode: "5472_1120",
      checklist: checklist([
        "Prepare Form 5472",
        "Attach the pro-forma Form 1120",
        "Save the fax or mailing acknowledgement",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (lowerTitle.includes("1065")) {
    return {
      filingCode: "1065",
      checklist: checklist([
        "Prepare Form 1065",
        "Deliver Schedule K-1 to each member",
        "Store the filing acknowledgement",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (lowerTitle.includes("1120")) {
    return {
      filingCode: "1120",
      checklist: checklist([
        "Prepare Form 1120",
        "Confirm payment or extension details if needed",
        "Store the filing acknowledgement",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (lowerTitle.includes("fbar")) {
    return {
      filingCode: "fbar",
      optional: true,
      optionalPrompt:
        "Does this LLC have signature authority over foreign financial accounts totaling more than $10,000?",
      checklist: checklist([
        "Confirm whether FBAR applies",
        "Prepare FinCEN Form 114 if it applies",
        "Keep the submission confirmation",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (
    lowerTitle.includes("annual report") ||
    lowerTitle.includes("franchise tax")
  ) {
    return {
      filingCode: "annual_report",
      checklist: checklist([
        "Review the state filing requirements",
        "Submit the report or franchise tax payment",
        "Keep the state confirmation receipt",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (lowerTitle.includes("registered agent")) {
    return {
      filingCode: "ra_renewal",
      checklist: checklist([
        "Confirm the registered agent service details",
        "Pay or renew the service",
        "Save the renewal confirmation",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (lowerTitle.includes("boi")) {
    return {
      filingCode: "boi_report",
      checklist: checklist([
        "Confirm BOI still applies to this entity",
        "Submit the BOI report if required",
        "Keep the FinCEN confirmation",
      ]),
    } as ComplianceTaskMetadata;
  }

  if (lowerTitle.includes("ein")) {
    return {
      filingCode: "ein_application",
      checklist: checklist([
        "Prepare Form SS-4",
        "Submit the EIN request",
        "Save the IRS acknowledgement or CP 575 letter",
      ]),
    } as ComplianceTaskMetadata;
  }

  return {
    filingCode: "general_compliance",
    checklist: task.description
      ? checklist([
          "Review the requirement",
          "Complete the task",
          "Store proof of completion",
        ])
      : [],
  } as ComplianceTaskMetadata;
}

export function getTaskMetadata(
  task: Pick<
    ComplianceTaskRecord,
    "title" | "description" | "status" | "metadata"
  >
) {
  const inferred = inferTaskMetadata(task);
  const persisted = (task.metadata ?? {}) as ComplianceTaskMetadata;

  return {
    ...inferred,
    ...persisted,
    applicable: persisted.applicable ?? inferred.applicable ?? true,
    optional: persisted.optional ?? inferred.optional ?? false,
    optionalPrompt: persisted.optionalPrompt ?? inferred.optionalPrompt,
    checklist: mergeChecklist(inferred.checklist, persisted.checklist),
    filing: {
      ...inferred.filing,
      ...persisted.filing,
    },
  } satisfies ComplianceTaskMetadata;
}

export function buildSeedTaskMetadata(
  task: Pick<ComplianceTaskRecord, "title" | "description" | "status">
) {
  return getTaskMetadata({ ...task, metadata: null });
}

export function isTaskVisible(
  task: Pick<
    ComplianceTaskRecord,
    "title" | "description" | "status" | "metadata"
  >
) {
  return getTaskMetadata(task).applicable !== false;
}

export function getVisibleTasks<
  T extends Pick<
    ComplianceTaskRecord,
    "title" | "description" | "status" | "metadata"
  >,
>(tasks: T[]) {
  return tasks.filter((task) => isTaskVisible(task));
}

export function getChecklistProgress(
  task: Pick<
    ComplianceTaskRecord,
    "title" | "description" | "status" | "metadata"
  >
) {
  const items = getTaskMetadata(task).checklist ?? [];
  const completed = items.filter((item) => item.done).length;

  return {
    total: items.length,
    completed,
  };
}

export function getDerivedTaskState(
  task: Pick<
    ComplianceTaskRecord,
    "title" | "description" | "dueDate" | "status" | "metadata"
  >,
  now = new Date()
): DerivedTaskState {
  if (!isTaskVisible(task)) return "hidden";
  if (task.status === "completed") return "completed";

  const dueDate = new Date(`${task.dueDate}T00:00:00.000Z`);
  const nowUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const diffInDays = Math.floor(
    (dueDate.getTime() - nowUtc.getTime()) / DAY_IN_MS
  );

  if (diffInDays < 0) return "overdue";
  if (diffInDays <= 30) return "due_soon";
  return "upcoming";
}

export function getTaskStatusLabel(state: DerivedTaskState) {
  return state.replace("_", " ");
}

export function getFirstThirtyDayChecklist(
  llc: Pick<LlcRecord, "einStatus" | "filingPreferences">,
  tasks: Pick<
    ComplianceTaskRecord,
    "title" | "description" | "status" | "metadata"
  >[]
) {
  const saved = llc.filingPreferences?.checklists?.first30Days ?? {};
  const hasEINTask = tasks.some(
    (task) => getTaskMetadata(task).filingCode === "ein_application"
  );
  const hasCalendarTasks = getVisibleTasks(tasks).length > 0;
  const hasOptionalFbar = tasks.some(
    (task) => getTaskMetadata(task).filingCode === "fbar"
  );

  return [
    {
      id: "ein",
      label: hasEINTask
        ? "Finish your EIN application and save the acknowledgement"
        : "Confirm your EIN details are stored in Pax",
      checked: saved.ein ?? llc.einStatus === "received",
    },
    {
      id: "documents",
      label: "Upload your formation documents and IRS letters to the vault",
      checked: saved.documents ?? false,
    },
    {
      id: "banking",
      label: "Open or confirm your U.S. business banking setup",
      checked: saved.banking ?? false,
    },
    {
      id: "calendar",
      label: hasCalendarTasks
        ? "Review your filing calendar and verify the upcoming deadlines"
        : "Review your filing calendar once tasks appear",
      checked: saved.calendar ?? false,
    },
    {
      id: "fbar",
      label: hasOptionalFbar
        ? "Answer the optional FBAR applicability question"
        : "Review optional filing questions as they appear",
      checked: saved.fbar ?? !hasOptionalFbar,
    },
  ];
}
