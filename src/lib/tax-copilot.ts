import {
  assessOwnershipScope,
  type DirectIndividualOwner,
} from "./ownership-scope";

export type TaxMember = Omit<DirectIndividualOwner, "usTaxStatus"> & {
  usTaxStatus?: DirectIndividualOwner["usTaxStatus"];
};

export type TaxEntityProfile = {
  id?: string;
  name: string;
  entityType: string;
  ownerResidency: string | null;
  ownersAreIndividuals?: boolean | null;
  ownershipIsDirect?: boolean | null;
  ownerCount?: number | null;
  foreignOwnerCount?: number | null;
  usOwnerCount?: number | null;
  taxClassification: string | null;
  taxYearEnd: string | null;
  formationDate?: string | null;
  ein?: string | null;
  einStatus?: string | null;
  members?: TaxMember[] | null;
};

export type TaxSourceReference = {
  title: string;
  url: string;
  revision: string;
  section: string;
};

export type FilingAssessment = {
  route:
    | "foreign_owned_disregarded_entity"
    | "domestic_disregarded_entity"
    | "partnership"
    | "needs_review";
  status: "required" | "likely_required" | "owner_return" | "needs_review";
  title: string;
  summary: string;
  forms: string[];
  taxYear: number;
  dueDate: string | null;
  filingMethod: string;
  reasons: string[];
  warnings: string[];
  nextSteps: string[];
  sources: TaxSourceReference[];
};

export type PreparationCheck = {
  id: string;
  label: string;
  status: "complete" | "action_needed" | "review";
  detail: string;
};

export type TransactionDirection = "received" | "paid" | "unknown";

export type TransactionClassification = {
  part: "IV" | "V" | "VI" | "review";
  line: string | null;
  label: string;
  confidence: "high" | "medium" | "review";
  requiresStatement: boolean;
  explanation: string;
  source: TaxSourceReference;
};

export const FORM_5472_SOURCE: TaxSourceReference = {
  title: "Instructions for Form 5472",
  url: "https://www.irs.gov/instructions/i5472",
  revision: "December 2024",
  section: "General and Specific Instructions",
};

export const FORM_1120_SOURCE: TaxSourceReference = {
  title: "Instructions for Form 1120",
  url: "https://www.irs.gov/instructions/i1120",
  revision: "2025",
  section: "Who Must File; When To File",
};

export const FORM_1065_SOURCE: TaxSourceReference = {
  title: "Instructions for Form 1065",
  url: "https://www.irs.gov/instructions/i1065",
  revision: "2025",
  section: "Who Must File; When To File",
};

export function currentFilingTaxYear(now: Date) {
  return now.getUTCMonth() < 3
    ? now.getUTCFullYear() - 1
    : now.getUTCFullYear();
}

function parseTaxYearEnd(value: string | null) {
  const match = /^(\d{2})-(\d{2})$/.exec(value ?? "12-31");

  if (!match) return { month: 12, day: 31 };

  const month = Number(match[1]);
  const day = Number(match[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { month: 12, day: 31 };
  }

  return { month, day };
}

function rollWeekend(date: Date) {
  const result = new Date(date);

  if (result.getUTCDay() === 6) {
    result.setUTCDate(result.getUTCDate() + 2);
  } else if (result.getUTCDay() === 0) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result;
}

function filingDueDate(
  taxYear: number,
  taxYearEnd: string | null,
  monthsAfterYearEnd: number
) {
  const { month } = parseTaxYearEnd(taxYearEnd);
  const due = new Date(Date.UTC(taxYear, month - 1 + monthsAfterYearEnd, 15));

  return rollWeekend(due).toISOString().slice(0, 10);
}

function hasForeignMember(profile: TaxEntityProfile) {
  if ((profile.foreignOwnerCount ?? 0) > 0) return true;

  return (profile.members ?? []).some(
    (member) => member.usTaxStatus === "foreign_person"
  );
}

function assessForeignOwnedDisregardedEntity(
  profile: TaxEntityProfile,
  taxYear: number
): FilingAssessment {
  return {
    route: "foreign_owned_disregarded_entity",
    status: "likely_required",
    title: "Form 5472 with a pro forma Form 1120",
    summary:
      "The profile describes a domestic disregarded entity owned by a declared foreign person. Form 5472 is generally required when the LLC had a reportable transaction with its owner or another related party; the filing is attached to a limited pro forma Form 1120.",
    forms: ["Form 5472", "Pro forma Form 1120"],
    taxYear,
    dueDate: filingDueDate(taxYear, profile.taxYearEnd, 4),
    filingMethod:
      "Fax at 300 DPI or higher, or mail to the dedicated IRS Ogden address. Electronic filing is not available for this foreign-owned U.S. DE filing path.",
    reasons: [
      "The entity is recorded as a single-member or disregarded U.S. entity.",
      "The owner is recorded as a foreign person for U.S. tax purposes.",
      "Formation, contributions, distributions, loans, owner-paid expenses, reimbursements, and other related-party movements can be reportable transactions.",
    ],
    warnings: [
      "Confirm that at least one reportable transaction occurred during the tax year. No income does not by itself remove the Form 5472 requirement.",
      "A separate Form 5472 is generally prepared for each related party with reportable transactions.",
      "The Form 5472 failure-to-file penalty starts at $25,000, and a substantially incomplete return can be treated as not filed.",
    ],
    nextSteps: [
      "Confirm the LLC EIN and the owner's identifying information, foreign TIN, address, and country.",
      "Collect all owner and related-party transactions for the tax year.",
      "Map monetary transactions to Part IV and formation, contribution, distribution, or dissolution activity to Part V.",
      "Complete only the LLC name and address and items B and E on the pro forma Form 1120, and write “Foreign-owned U.S. DE” across the top.",
      "Save fax transmission proof or certified mailing evidence with the final signed filing.",
    ],
    sources: [FORM_5472_SOURCE, FORM_1120_SOURCE],
  };
}

function assessPartnership(
  profile: TaxEntityProfile,
  taxYear: number
): FilingAssessment {
  const foreignPartner = hasForeignMember(profile);

  return {
    route: "partnership",
    status: "likely_required",
    title: "Form 1065 partnership return",
    summary:
      "The profile describes a multi-member LLC taxed as a partnership. A domestic partnership generally files Form 1065 and furnishes a Schedule K-1 to every person who was a partner during the year.",
    forms: ["Form 1065", "Schedule K-1 for each partner"],
    taxYear,
    dueDate: filingDueDate(taxYear, profile.taxYearEnd, 3),
    filingMethod:
      "Download the draft Form 1065 package and follow the current IRS instructions or give the package to a tax professional. Pax does not transmit the return.",
    reasons: [
      "The entity has multiple members or is recorded with partnership tax classification.",
      "A domestic LLC with at least two members is generally classified as a partnership unless it elected corporate treatment.",
    ],
    warnings: [
      "A domestic partnership may avoid Form 1065 only when it had neither income nor expenditures treated as deductions or credits during the year.",
      "Form 5471 is not the default return for a multi-member U.S. LLC. It concerns certain U.S. persons with respect to foreign corporations.",
      ...(foreignPartner
        ? [
            "The profile indicates at least one foreign partner. Review Schedule K-2/K-3 and sections 1446 withholding, including Forms 8804 and 8805, rather than assuming those forms automatically apply.",
          ]
        : []),
    ],
    nextSteps: [
      "Verify that ownership percentages total 100% and identify every person who was a partner during the year.",
      "Collect the partnership's income, expenses, assets, liabilities, contributions, and distributions.",
      "Prepare one Schedule K-1 for each partner and review international reporting if any partner is foreign.",
      "Review the completed draft, sign the final return, and follow the current IRS filing instructions.",
    ],
    sources: [FORM_1065_SOURCE],
  };
}

function assessDomesticDisregardedEntity(
  profile: TaxEntityProfile,
  taxYear: number
): FilingAssessment {
  return {
    route: "domestic_disregarded_entity",
    status: "owner_return",
    title: "Activity generally belongs on the owner's return",
    summary:
      "The profile describes a single-member disregarded entity owned by a declared U.S. person. It generally does not file a separate federal income-tax return solely because it is an LLC.",
    forms: ["Owner return classification review"],
    taxYear,
    dueDate: null,
    filingMethod:
      "Report the activity on the applicable owner return and schedule based on the nature of the activity.",
    reasons: [
      "The entity is recorded as a disregarded single-member LLC.",
      "The owner is recorded as a U.S. person for U.S. tax purposes.",
    ],
    warnings: [
      "Employment, excise, state, and other information-return obligations can still apply.",
    ],
    nextSteps: [
      "Determine whether the activity belongs on Schedule C, E, or F, or another owner-return schedule.",
      "Keep the LLC's books and supporting documents separate and complete.",
    ],
    sources: [FORM_1120_SOURCE],
  };
}

export function assessFederalTaxFiling(
  profile: TaxEntityProfile,
  options: { taxYear?: number; now?: Date } = {}
): FilingAssessment {
  const taxYear =
    options.taxYear ?? currentFilingTaxYear(options.now ?? new Date());

  const scope = assessOwnershipScope(profile);

  if (scope.route === "partnership") return assessPartnership(profile, taxYear);

  if (scope.route === "foreign_owned_disregarded_entity") {
    return assessForeignOwnedDisregardedEntity(profile, taxYear);
  }

  if (scope.route === "domestic_disregarded_entity") {
    return assessDomesticDisregardedEntity(profile, taxYear);
  }

  return {
    route: "needs_review",
    status: "needs_review",
    title: "Federal return type needs review",
    summary:
      "The saved ownership or federal tax classification is outside Pax's supported filing scope.",
    forms: [],
    taxYear,
    dueDate: null,
    filingMethod: "Confirm the federal entity classification before filing.",
    reasons: scope.reasons,
    warnings: [
      "Pax does not prepare corporation returns, LLC corporate-tax elections, entity-owner structures, or indirect ownership structures.",
      "Update and confirm the ownership profile or consult a qualified tax professional before relying on a filing deadline.",
    ],
    nextSteps: [
      "Confirm that every owner is an individual who holds the ownership interest directly.",
      "Confirm each owner's U.S. tax status and ownership percentage.",
      "Confirm the entity type and federal tax classification.",
    ],
    sources: [],
  };
}

function buildCommonChecks(profile: TaxEntityProfile): PreparationCheck[] {
  const hasEin = profile.einStatus === "received" || Boolean(profile.ein);

  return [
    {
      id: "ein",
      label: "EIN available",
      status: hasEin ? "complete" : "action_needed",
      detail: hasEin
        ? "The profile indicates that an EIN is available."
        : "An EIN is needed to complete the entity return.",
    },
    {
      id: "tax-year",
      label: "Tax year end confirmed",
      status: /^\d{2}-\d{2}$/.test(profile.taxYearEnd ?? "")
        ? "complete"
        : "action_needed",
      detail: profile.taxYearEnd
        ? `Saved tax year end: ${profile.taxYearEnd}.`
        : "Confirm the entity's tax year end.",
    },
  ];
}

function buildForeignDeChecks(profile: TaxEntityProfile): PreparationCheck[] {
  const members = profile.members ?? [];

  const ownershipTotal = members.reduce(
    (total, member) => total + member.ownershipPct,
    0
  );

  const hasSingleOwner = members.length === 1 && ownershipTotal === 100;

  const hasOwnerIdentifiers =
    hasSingleOwner &&
    Boolean(members[0]?.country) &&
    Boolean(members[0]?.taxIdType);

  return [
    {
      id: "owner",
      label: "Foreign owner profile",
      status: hasSingleOwner ? "complete" : "action_needed",
      detail: hasSingleOwner
        ? "One 100% owner is recorded."
        : "Record exactly one 100% owner for the single-member LLC.",
    },
    {
      id: "owner-identifiers",
      label: "Owner country and tax identifier",
      status: hasOwnerIdentifiers ? "complete" : "action_needed",
      detail:
        "Form 5472 asks for owner address, country, U.S. identifier if any, reference ID when required, and FTIN if any.",
    },
    {
      id: "transactions",
      label: "Related-party transaction ledger",
      status: "action_needed",
      detail:
        "Confirm contributions, distributions, owner-paid expenses, reimbursements, loans, formation costs, and other owner or related-party transactions for the tax year.",
    },
    {
      id: "filing-proof",
      label: "Special filing method and proof",
      status: "review",
      detail:
        "Plan to retain the fax confirmation or tracked-mail evidence. This filing cannot be e-filed under the foreign-owned U.S. DE procedure.",
    },
  ];
}

function buildPartnershipChecks(profile: TaxEntityProfile): PreparationCheck[] {
  const members = profile.members ?? [];

  const ownershipTotal = members.reduce(
    (total, member) => total + member.ownershipPct,
    0
  );

  const hasCompletePartnerList =
    members.length >= 2 && Math.abs(ownershipTotal - 100) < 0.01;

  const foreignPartner = hasForeignMember(profile);

  return [
    {
      id: "partners",
      label: "Partner list and ownership",
      status: hasCompletePartnerList ? "complete" : "action_needed",
      detail: hasCompletePartnerList
        ? `${members.length} partners are recorded and ownership totals 100%.`
        : "Record every partner and make sure ownership totals 100%.",
    },
    {
      id: "k1",
      label: "Schedule K-1 for each partner",
      status: "action_needed",
      detail: `Prepare and furnish ${Math.max(members.length, 2)} Schedule K-1 forms based on the saved partner list.`,
    },
    {
      id: "international",
      label: "Foreign-partner review",
      status: foreignPartner ? "review" : "complete",
      detail: foreignPartner
        ? "Review Schedule K-2/K-3 and section 1446 withholding forms for foreign partners."
        : "No foreign partner signal was found in the saved profile.",
    },
  ];
}

export function buildPreparationChecks(
  profile: TaxEntityProfile,
  assessment = assessFederalTaxFiling(profile)
): PreparationCheck[] {
  const common = buildCommonChecks(profile);

  if (assessment.route === "foreign_owned_disregarded_entity") {
    return [...common, ...buildForeignDeChecks(profile)];
  }

  if (assessment.route === "partnership") {
    return [...common, ...buildPartnershipChecks(profile)];
  }

  return common;
}

const PART_V_PATTERN =
  /formation|formed|organize|organisation|organization|dissolution|dissolve|acquisition|acquire|disposition|dispose|capital contribution|contributed capital|owner contribution|distribution|withdrawal/i;

const PART_V_REVIEW_PATTERN =
  /owner[- ]paid|paid personally|reimburse|reimbursement|personal card/i;

const PART_VI_PATTERN =
  /nonmonetary|non-monetary|barter|below market|less than full|without consideration|free of charge|gift/i;

const RECEIVED_LINES: Array<[RegExp, string, string]> = [
  [/inventory|stock in trade/i, "9", "Sales of inventory"],
  [
    /tangible property|equipment|computer|furniture/i,
    "10",
    "Sales of tangible property",
  ],
  [/rent/i, "13a", "Rents received"],
  [/royalt/i, "13b", "Royalties received"],
  [
    /patent|trademark|copyright|intangible|license/i,
    "14",
    "Intangible property consideration received",
  ],
  [
    /service|consult|management|engineering|technical/i,
    "15",
    "Services consideration received",
  ],
  [/commission/i, "16", "Commissions received"],
  [/borrow|loan from|advance from/i, "17", "Amounts borrowed"],
  [/interest/i, "18", "Interest received"],
  [/insurance|reinsurance|premium/i, "19", "Insurance premiums received"],
  [/guarantee fee/i, "20", "Loan guarantee fees received"],
];

const PAID_LINES: Array<[RegExp, string, string]> = [
  [/inventory|stock in trade/i, "23", "Purchases of inventory"],
  [
    /tangible property|equipment|computer|furniture/i,
    "24",
    "Purchases of tangible property",
  ],
  [/rent/i, "27a", "Rents paid"],
  [/royalt/i, "27b", "Royalties paid"],
  [
    /patent|trademark|copyright|intangible|license/i,
    "28",
    "Intangible property consideration paid",
  ],
  [
    /service|consult|management|engineering|technical/i,
    "29",
    "Services consideration paid",
  ],
  [/commission/i, "30", "Commissions paid"],
  [/loan to|lent|amounts loaned|advance to/i, "31", "Amounts loaned"],
  [/interest/i, "32", "Interest paid"],
  [/insurance|reinsurance|premium/i, "33", "Insurance premiums paid"],
  [/guarantee fee/i, "34", "Loan guarantee fees paid"],
];

function classifyPartIV(
  description: string,
  direction: TransactionDirection
): TransactionClassification {
  const mappings = direction === "received" ? RECEIVED_LINES : PAID_LINES;
  const match = mappings.find(([pattern]) => pattern.test(description));

  if (match) {
    return {
      part: "IV",
      line: match[1],
      label: match[2],
      confidence: "medium",
      requiresStatement: false,
      explanation:
        "This appears to be a monetary transaction with a foreign related party. Confirm the direction, legal character, and amount before using the suggested line.",
      source: FORM_5472_SOURCE,
    };
  }

  return {
    part: "IV",
    line: direction === "received" ? "21" : "35",
    label:
      direction === "received"
        ? "Other amounts received"
        : "Other amounts paid",
    confidence: "review",
    requiresStatement: true,
    explanation:
      "No specific Part IV category was identified. Review whether the transaction belongs on the other-amounts line or is instead a Part V or Part VI transaction.",
    source: FORM_5472_SOURCE,
  };
}

export function classify5472Transaction({
  description,
  direction = "unknown",
}: {
  description: string;
  direction?: TransactionDirection;
}): TransactionClassification {
  if (PART_VI_PATTERN.test(description)) {
    return {
      part: "VI",
      line: null,
      label: "Nonmonetary or less-than-full-consideration transaction",
      confidence: "high",
      requiresStatement: true,
      explanation:
        "Part VI requires an attached description of the property, rights, obligations, or services exchanged and a reasonable value estimate when possible.",
      source: FORM_5472_SOURCE,
    };
  }

  if (PART_V_PATTERN.test(description)) {
    return {
      part: "V",
      line: null,
      label: "Foreign-owned U.S. DE transaction",
      confidence: "high",
      requiresStatement: true,
      explanation:
        "Formation, dissolution, acquisition, disposition, contributions, and distributions are explicit Part V examples and are described on an attached statement.",
      source: FORM_5472_SOURCE,
    };
  }

  if (PART_V_REVIEW_PATTERN.test(description)) {
    return {
      part: "review",
      line: null,
      label: "Owner-paid expense or reimbursement",
      confidence: "review",
      requiresStatement: true,
      explanation:
        "Owner-paid expenses may represent a contribution, while reimbursements may be a separate monetary transaction. Review the accounting treatment and the direction of payment before assigning Part IV or Part V.",
      source: FORM_5472_SOURCE,
    };
  }

  if (direction === "unknown") {
    return {
      part: "review",
      line: null,
      label: "Transaction direction required",
      confidence: "review",
      requiresStatement: false,
      explanation:
        "Specify whether the LLC paid the related party or received the amount before selecting a Part IV line.",
      source: FORM_5472_SOURCE,
    };
  }

  return classifyPartIV(description, direction);
}
