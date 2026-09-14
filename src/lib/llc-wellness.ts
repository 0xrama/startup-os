import {
  assessFederalTaxFiling,
  type TaxEntityProfile,
  type TaxSourceReference,
} from "./tax-copilot";

export type WellnessProfile = {
  businessStatus?: "not_started" | "pre_revenue" | "active" | "inactive";
  businessDescription?: string;
  engagedInUSTradeOrBusiness?: "yes" | "no" | "unsure";
  principalPlaceOfBusiness?: "us" | "outside_us" | "unsure";
  hasUSBankAccount?: boolean;
  bookkeepingCurrent?: boolean;
  hasEmployees?: boolean;
  usesContractors?: boolean;
  makesTaxableSales?: boolean;
  operatesOutsideFormationState?: boolean;
  updatedAt?: string;
};

export type WellnessDocument = {
  name: string;
  category: string | null;
};

export type WellnessTask = {
  title: string;
  dueDate: string;
  status: string | null;
};

export type WellnessCheck = {
  id: string;
  category:
    "formation" | "federal" | "finance" | "operations" | "state" | "compliance";
  title: string;
  status: "healthy" | "action_needed" | "review" | "not_applicable";
  explanation: string;
  action?: string;
  source?: TaxSourceReference;
};

export type WellnessAssessment = {
  score: number;
  status: "healthy" | "attention" | "incomplete";
  headline: string;
  checks: WellnessCheck[];
};

const EIN_SOURCE: TaxSourceReference = {
  title: "Instructions for Form SS-4",
  url: "https://www.irs.gov/instructions/iss4",
  revision: "December 2025",
  section: "How To Apply for an EIN; Disregarded entities",
};

function hasOperatingAgreement(documents: WellnessDocument[]) {
  return documents.some(
    (document) =>
      document.category === "operating_agreement" ||
      /operating agreement/i.test(document.name)
  );
}

function businessStatusCheck(wellness: WellnessProfile): WellnessCheck {
  if (!wellness.businessStatus) {
    return {
      id: "business-status",
      category: "operations",
      title: "Business activity status",
      status: "action_needed",
      explanation:
        "Confirm whether the LLC is active, pre-revenue, not started, or inactive so the copilot can surface operational obligations.",
      action: "Complete the wellness questionnaire.",
    };
  }

  return {
    id: "business-status",
    category: "operations",
    title: "Business activity status",
    status: "healthy",
    explanation: `The LLC is marked as ${wellness.businessStatus.replaceAll("_", " ")}.`,
  };
}

function tradeOrBusinessCheck(
  profile: TaxEntityProfile,
  wellness: WellnessProfile
): WellnessCheck {
  if (profile.ownerResidency !== "non_us") {
    return {
      id: "us-trade-or-business",
      category: "federal",
      title: "U.S. trade or business review",
      status: "not_applicable",
      explanation:
        "The saved owner status is a U.S. person, so the foreign-owner trade-or-business review is not the primary issue.",
    };
  }

  if (
    !wellness.engagedInUSTradeOrBusiness ||
    wellness.engagedInUSTradeOrBusiness === "unsure"
  ) {
    return {
      id: "us-trade-or-business",
      category: "federal",
      title: "U.S. trade or business review",
      status: "review",
      explanation:
        "Whether a foreign owner is engaged in a U.S. trade or business is fact-specific and can affect the owner's U.S. income-tax filing in addition to the LLC's information returns.",
      action:
        "Record where services are performed, where people and offices are located, and how U.S. customers are served, then obtain tax review if uncertain.",
    };
  }

  return {
    id: "us-trade-or-business",
    category: "federal",
    title: "U.S. trade or business review",
    status:
      wellness.engagedInUSTradeOrBusiness === "yes" ? "review" : "healthy",
    explanation:
      wellness.engagedInUSTradeOrBusiness === "yes"
        ? "The LLC is marked as engaging in a U.S. trade or business. Review the foreign owner's U.S. income-tax return, effectively connected income, and any withholding obligations in addition to entity filings."
        : "The LLC is marked as not engaging in a U.S. trade or business. Preserve the facts supporting that conclusion and continue the entity's information-return review.",
  };
}

function financeChecks(
  wellness: WellnessProfile,
  active: boolean
): WellnessCheck[] {
  return [
    {
      id: "bank-account",
      category: "finance",
      title: "Separate business bank account",
      status:
        wellness.hasUSBankAccount === true
          ? "healthy"
          : wellness.hasUSBankAccount === false
            ? "action_needed"
            : "review",
      explanation:
        wellness.hasUSBankAccount === true
          ? "A U.S. business bank account is recorded."
          : "A separate business account helps preserve clean records and avoids mixing owner and LLC funds.",
      action:
        wellness.hasUSBankAccount === true
          ? undefined
          : "Open or designate a bank account used only for LLC activity.",
    },
    {
      id: "bookkeeping",
      category: "finance",
      title: "Current bookkeeping",
      status:
        wellness.bookkeepingCurrent === true
          ? "healthy"
          : active
            ? "action_needed"
            : "review",
      explanation:
        wellness.bookkeepingCurrent === true
          ? "Bookkeeping is marked current."
          : "Maintain a transaction ledger, receipts, invoices, owner contributions, distributions, loans, and reimbursements even when the LLC has little or no revenue.",
      action:
        wellness.bookkeepingCurrent === true
          ? undefined
          : "Reconcile the LLC's books through the latest month.",
    },
  ];
}

function complianceCalendarCheck(tasks: WellnessTask[]): WellnessCheck {
  const openTasks = tasks.filter((task) => task.status !== "completed");

  const today = new Date().toISOString().slice(0, 10);

  const overdueTasks = openTasks.filter((task) => task.dueDate < today);

  if (overdueTasks.length > 0) {
    return {
      id: "compliance-calendar",
      category: "compliance",
      title: "Required compliance tasks",
      status: "action_needed",
      explanation: `${overdueTasks.length} required task${overdueTasks.length === 1 ? " is" : "s are"} past the recorded due date.`,
      action: `Resolve ${overdueTasks[0].title} first, then confirm the remaining state and federal deadlines.`,
    };
  }

  const nextTask = [...openTasks].sort((left, right) =>
    left.dueDate.localeCompare(right.dueDate)
  )[0];

  if (nextTask) {
    return {
      id: "compliance-calendar",
      category: "compliance",
      title: "Required compliance tasks",
      status: "healthy",
      explanation: `${openTasks.length} open task${openTasks.length === 1 ? " is" : "s are"} on the compliance calendar. The next recorded item is ${nextTask.title}, due ${nextTask.dueDate}.`,
    };
  }

  return {
    id: "compliance-calendar",
    category: "compliance",
    title: "Required compliance tasks",
    status: "review",
    explanation:
      "No open compliance tasks are recorded. Confirm that formation-state annual reports, registered-agent renewal, federal returns, and any other-state obligations have been added.",
    action: "Review and populate the compliance calendar.",
  };
}

function activeBusinessChecks(wellness: WellnessProfile): WellnessCheck[] {
  if (wellness.businessStatus !== "active") return [];

  return [
    {
      id: "employees",
      category: "operations",
      title: "Payroll and employment filings",
      status: wellness.hasEmployees ? "review" : "not_applicable",
      explanation: wellness.hasEmployees
        ? "Employees can trigger payroll registration, withholding, employment tax deposits, Forms 941 or 944, Forms W-2/W-3, and state payroll obligations."
        : "No employees are recorded.",
      action: wellness.hasEmployees
        ? "Confirm federal and state payroll accounts and filing cadence."
        : undefined,
    },
    {
      id: "contractors",
      category: "operations",
      title: "Contractor documentation",
      status: wellness.usesContractors ? "review" : "not_applicable",
      explanation: wellness.usesContractors
        ? "Collect the appropriate Form W-9 or W-8 documentation before payment and review Forms 1099 or 1042-S reporting based on the payee and payment type."
        : "No contractors are recorded.",
      action: wellness.usesContractors
        ? "Review contractor tax forms and year-end information reporting."
        : undefined,
    },
    {
      id: "sales-tax",
      category: "state",
      title: "Sales-tax and indirect-tax review",
      status: wellness.makesTaxableSales ? "review" : "not_applicable",
      explanation: wellness.makesTaxableSales
        ? "Selling taxable goods or services can create registration, collection, and filing duties based on the states where customers and business activity are located."
        : "No potentially taxable sales are recorded.",
      action: wellness.makesTaxableSales
        ? "Check product taxability and economic or physical nexus by state."
        : undefined,
    },
    {
      id: "foreign-qualification",
      category: "state",
      title: "Other-state registration review",
      status: wellness.operatesOutsideFormationState
        ? "review"
        : "not_applicable",
      explanation: wellness.operatesOutsideFormationState
        ? "Employees, offices, inventory, or sustained operations outside the formation state may require foreign qualification, registered agents, and additional state returns."
        : "No activity outside the formation state is recorded.",
      action: wellness.operatesOutsideFormationState
        ? "Review every state where the LLC has people, property, inventory, or recurring operations."
        : undefined,
    },
  ];
}

export function assessLlcWellness({
  profile,
  wellness,
  documents,
  tasks = [],
}: {
  profile: TaxEntityProfile;
  wellness: WellnessProfile;
  documents: WellnessDocument[];
  tasks?: WellnessTask[];
}): WellnessAssessment {
  const filing = assessFederalTaxFiling(profile);

  const agreementFound = hasOperatingAgreement(documents);

  const active = wellness.businessStatus === "active";

  const checks: WellnessCheck[] = [
    businessStatusCheck(wellness),
    {
      id: "operating-agreement",
      category: "formation",
      title: "Operating agreement",
      status: agreementFound ? "healthy" : "action_needed",
      explanation: agreementFound
        ? "An operating agreement is present in the document vault."
        : "No operating agreement was found in the document vault. Even a single-member LLC benefits from written ownership, management, banking, tax, and succession rules.",
      action: agreementFound
        ? undefined
        : "Generate a starter draft, review it for the formation state, sign it, and upload the final copy.",
    },
    {
      id: "ein",
      category: "federal",
      title: "Employer identification number",
      status:
        profile.einStatus === "received" || profile.ein
          ? "healthy"
          : "action_needed",
      explanation:
        profile.einStatus === "received" || profile.ein
          ? "The LLC profile indicates that an EIN is available."
          : "The LLC needs an EIN for its entity filings and commonly for banking. Foreign applicants can use Form SS-4 by fax.",
      action:
        profile.einStatus === "received" || profile.ein
          ? undefined
          : "Complete Form SS-4 and use the correct fax number for the LLC's principal place of business.",
      source: EIN_SOURCE,
    },
    complianceCalendarCheck(tasks),
    {
      id: "federal-return",
      category: "federal",
      title: filing.title,
      status: "review",
      explanation: filing.summary,
      action: filing.nextSteps[0],
      source: filing.sources[0],
    },
    tradeOrBusinessCheck(profile, wellness),
    ...financeChecks(wellness, active),
    ...activeBusinessChecks(wellness),
  ];

  const relevant = checks.filter((check) => check.status !== "not_applicable");

  const healthy = relevant.filter((check) => check.status === "healthy").length;

  const score = relevant.length
    ? Math.round((healthy / relevant.length) * 100)
    : 100;

  const actionCount = relevant.filter(
    (check) => check.status === "action_needed"
  ).length;

  const reviewCount = relevant.filter(
    (check) => check.status === "review"
  ).length;

  return {
    score,
    status:
      actionCount > 0
        ? "incomplete"
        : reviewCount > 0
          ? "attention"
          : "healthy",
    headline:
      actionCount > 0
        ? `${actionCount} setup or compliance items need action.`
        : reviewCount > 0
          ? `${reviewCount} items need review based on the LLC's activity.`
          : "The LLC's recorded compliance setup looks healthy.",
    checks,
  };
}

export function getEinFaxGuide({
  profile,
  principalPlaceOfBusiness,
}: {
  profile: TaxEntityProfile;
  principalPlaceOfBusiness?: WellnessProfile["principalPlaceOfBusiness"];
}) {
  return {
    title: "Apply for an EIN by fax as an international owner",
    source: EIN_SOURCE,
    important:
      "The owner's nationality and address do not determine the fax number by themselves. The IRS test asks whether the applicant has any legal residence, principal place of business, or principal office or agency in a U.S. state or the District of Columbia.",
    faxNumbers:
      principalPlaceOfBusiness === "us"
        ? [
            "855-641-6935 because the applicant has a principal place of business in a U.S. state or the District of Columbia.",
          ]
        : principalPlaceOfBusiness === "outside_us"
          ? [
              "Use 855-641-6935 if the applicant nevertheless has a legal residence or principal office or agency in a U.S. state or the District of Columbia.",
              "Only if the applicant has none of those U.S. connections: use 304-707-9471 when faxing from outside the United States or 855-215-1627 when faxing from within the United States.",
            ]
          : [
              "Use 855-641-6935 if the applicant has any legal residence, principal place of business, or principal office or agency in a U.S. state or the District of Columbia.",
              "If it has none: use 304-707-9471 when faxing from outside the United States or 855-215-1627 when faxing from within the United States.",
            ],
    steps: [
      `Use the exact legal LLC name: ${profile.name}.`,
      "Complete Form SS-4 after the LLC has been formed with the state.",
      "Lines 7a–7b: identify the individual responsible party. If that person has no SSN or ITIN and is ineligible for one, enter “foreign” or “N/A” on line 7b.",
      "Lines 8a–8c: mark that the applicant is an LLC, enter the member count, and enter the formation state.",
      "For a foreign-owned U.S. disregarded entity applying for Form 5472 purposes, check “Other” on line 9a and write “Foreign-owned U.S. disregarded entity-Form 5472.”",
      "On line 10, use the applicable reason. The SS-4 instructions say a foreign-owned U.S. disregarded entity filing Form 5472 can enter “Foreign-owned U.S. disregarded entity filing Form 5472.”",
      "Enter the business start date, accounting year closing month, expected employee counts, and principal activity.",
      "Add a return fax number, sign and date the form, keep the transmission confirmation, and do not submit duplicate EIN applications through another method.",
    ],
    timing:
      "The IRS states that fax applications generally receive an EIN response within 4 business days when a return fax number is provided. Processing delays can occur.",
  };
}
