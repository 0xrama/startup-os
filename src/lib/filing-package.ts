import type {
  FilingAssessment,
  PreparationCheck,
  TaxEntityProfile,
} from "./tax-copilot";

export type FilingPackageType = "form_5472_proforma_1120" | "form_1065";

const PACKAGE_TYPE_LABELS: Record<FilingPackageType, string> = {
  form_5472_proforma_1120:
    "Form 5472 and pro forma Form 1120 preparation package",
  form_1065: "Form 1065 partnership preparation package",
};

/**
 * Maps a supported filing route to its package. Domestic disregarded entities
 * intentionally resolve to null: their activity belongs on the owner's return,
 * so a separate federal preparation package would mislead the user.
 */
export function resolvePackageType(
  route: FilingAssessment["route"]
): FilingPackageType | null {
  if (route === "foreign_owned_disregarded_entity") {
    return "form_5472_proforma_1120";
  }

  if (route === "partnership") {
    return "form_1065";
  }

  return null;
}

function formatCheck(check: PreparationCheck) {
  const marker =
    check.status === "complete"
      ? "[x]"
      : check.status === "review"
        ? "[~]"
        : "[ ]";

  return `- ${marker} ${check.label}: ${check.detail}`;
}

function formatSource(source: FilingAssessment["sources"][number]) {
  return `- ${source.title} (revision ${source.revision}) — ${source.url}, section: ${source.section}`;
}

function formatMemberTable(profile: TaxEntityProfile) {
  const members = profile.members ?? [];

  if (members.length === 0) {
    return "_No plaintext owner list is stored for this entity. Owners may be vault-encrypted; copy their details from your records._";
  }

  const rows = members.map(
    (member) =>
      `| ${member.name || "—"} | ${member.ownershipPct}% | ${
        member.country || "—"
      } | ${member.usTaxStatus === "us_person" ? "U.S. person" : member.usTaxStatus === "foreign_person" ? "Foreign person" : "Unrecorded"} | ${
        member.taxIdType || "—"
      } |`
  );

  return [
    "| Owner | Ownership | Country | U.S. tax status | Tax ID type |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function buildForm5472Sections(profile: TaxEntityProfile) {
  return [
    "## Form 5472 worksheet",
    "",
    "Complete the fields below from your records. Pax cannot verify transaction facts; every amount must come from your books.",
    "",
    "### Part I — Reporting corporation",
    "",
    "- Name of reporting corporation: " + profile.name,
    "- EIN: " + (profile.ein ?? "_fill from your EIN letter_"),
    "- Principal business activity: _fill_",
    "- Principal business address: _fill_",
    "",
    "### Part II — 25% foreign beneficial owner",
    "",
    "- Name and address of foreign beneficial owner: _fill_",
    "- Country of incorporation, organization, or residence: _fill_",
    "- U.S. taxpayer identification number (if any): _fill or state none_",
    "- Foreign reference ID type and number (if required): _fill_",
    "- Foreign tax identification number (FTIN, if any): _fill or state none_",
    "",
    "### Part III — Reportable related party (one Form 5472 per related party)",
    "",
    "- Related party name and address: _fill_",
    "- Relationship to reporting corporation: _typically the owner_",
    "- Country: _fill_",
    "",
    "### Part IV — Monetary transactions",
    "",
    "Record every monetary transaction with the related party. Suggested lines from the instructions: amounts borrowed (17), interest received (18), rents (13a), royalties (13b), services received (15), sales of inventory (9), sales of tangible property (10), commissions (16), and the paid-side equivalents (23-35). Use line 21 or 35 for other amounts and attach a description.",
    "",
    "| # | Date | Description | Direction | Amount and currency | Suggested Part IV line |",
    "| --- | --- | --- | --- | --- | --- |",
    "| 1 | _date_ | _description_ | _paid/received_ | _amount_ | _line_ |",
    "",
    "### Part V — Formation, dissolution, acquisition, disposition, contribution, distribution",
    "",
    "Each of these events is described on an attached statement. List them below and attach a statement per Form 5472 instructions.",
    "",
    "| # | Date | Event | Description | Reasonable value |",
    "| --- | --- | --- | --- | --- |",
    "| 1 | _date_ | _event_ | _description_ | _value_ |",
    "",
    "### Part VI — Nonmonetary and less-than-full-consideration transactions",
    "",
    "Describe the property, rights, obligations, or services exchanged and provide a reasonable value estimate where possible.",
    "",
    "| # | Date | What was exchanged | Description | Value basis |",
    "| --- | --- | --- | --- | --- |",
    "| 1 | _date_ | _item_ | _description_ | _basis_ |",
    "",
    "### Pro forma Form 1120",
    "",
    'Complete only the LLC name and address and items B and E on the pro forma Form 1120, write "Foreign-owned U.S. DE" across the top, and attach Form 5472. No other Form 1120 fields are completed for this filing path.',
    "",
  ].join("\n");
}

function buildForm1065Sections(profile: TaxEntityProfile) {
  return [
    "## Form 1065 organizer",
    "",
    "### Income and expense worksheet",
    "",
    "Fill from your bookkeeping records. Pax does not connect to banks or payment processors.",
    "",
    "| Line | Item | Amount (USD) |",
    "| --- | --- | --- |",
    "| 1a | Gross receipts or sales | _fill_ |",
    "| 2 | Cost of goods sold | _fill_ |",
    "| 9 | Total income | _fill_ |",
    "| 10 | Deductions (detail on Schedule B attachments) | _fill_ |",
    "| 22 | Total deductions | _fill_ |",
    "| 23 | Ordinary business income (loss) | _fill_ |",
    "",
    "### Partner detail for Schedule K",
    "",
    "| Partner | Ownership | U.S. tax status | Capital contributed this year | Distributions this year |",
    "| --- | --- | --- | --- | --- |",
    (profile.members ?? [])
      .map(
        (member) =>
          `| ${member.name || "—"} | ${member.ownershipPct}% | ${
            member.usTaxStatus === "us_person"
              ? "U.S. person"
              : member.usTaxStatus === "foreign_person"
                ? "Foreign person"
                : "Unrecorded"
          } | _fill_ | _fill_ |`
      )
      .join("\n") || "| — | — | — | — | — |",
    "",
    "### Schedule K-1 checklist",
    "",
    (profile.members ?? [])
      .map(
        (member) =>
          `- [ ] Prepare and furnish Schedule K-1 to ${member.name || "each partner"} (ownership ${member.ownershipPct}%)`
      )
      .join("\n") ||
      "- [ ] Prepare and furnish a Schedule K-1 to every partner",
    "",
    "### Foreign-partner review",
    "",
    (profile.members ?? []).some(
      (member) => member.usTaxStatus === "foreign_person"
    )
      ? "- The partner table marks at least one foreign partner. Review Schedule K-2/K-3 applicability and section 1446 withholding (Forms 8804/8805) with a qualified professional before filing."
      : "- No partner is recorded as a foreign person. Revisit if partner facts changed during the year.",
    "",
    "### Extension",
    "",
    "- If more time is needed, Form 7004 is due by the original return due date. The extension moves the filing deadline, not payment or K-1 furnishing expectations.",
    "",
  ].join("\n");
}

export type GeneratedFilingPackage = {
  title: string;
  fileName: string;
  markdown: string;
};

/**
 * Generates the deterministic preparation package. The same inputs always
 * produce the same bytes, which is what makes the stored checksum meaningful.
 */
export function generateFilingPackage(input: {
  profile: TaxEntityProfile;
  assessment: FilingAssessment;
  checks: PreparationCheck[];
  packageType: FilingPackageType;
  state?: string | null;
  version: number;
  generatedAt?: Date;
}): GeneratedFilingPackage {
  const { profile, assessment, checks, packageType } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const generatedDate = generatedAt.toISOString().slice(0, 10);

  const safeName = profile.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const title = `${PACKAGE_TYPE_LABELS[packageType]} — tax year ${assessment.taxYear}`;

  const sections = [
    `# ${title}`,
    "",
    `> **Draft preparation document — generated ${generatedDate}. This is not a filed return. Pax does not transmit filings, sign forms, or receive IRS acknowledgements. You complete, sign, and submit the official forms yourself, or hand this package to a professional you choose.**`,
    "",
    "## Entity facts",
    "",
    `- Legal name: ${profile.name}`,
    `- Formation state: ${input.state ?? "—"}`,
    `- Entity type: ${profile.entityType}`,
    `- Federal tax classification: ${profile.taxClassification ?? "—"}`,
    `- Tax year end: ${profile.taxYearEnd ?? "—"}`,
    `- Formation date: ${profile.formationDate ?? "—"}`,
    `- EIN: ${profile.ein ?? "_vault-encrypted or not yet received_"}`,
    "",
    "## Ownership (direct individuals only)",
    "",
    formatMemberTable(profile),
    "",
    "## Filing assessment",
    "",
    `- Route: ${assessment.route}`,
    `- Status: ${assessment.status}`,
    `- Tax year: ${assessment.taxYear}`,
    `- Calculated due date: ${assessment.dueDate ?? "n/a"} (rolled for weekends; confirm federal holidays before relying on it)`,
    `- Filing method: ${assessment.filingMethod}`,
    "",
    ...assessment.warnings.map((warning) => `- Warning: ${warning}`),
    "",
    "## Readiness checks",
    "",
    ...checks.map(formatCheck),
    "",
    packageType === "form_5472_proforma_1120"
      ? buildForm5472Sections(profile)
      : buildForm1065Sections(profile),
    "## Next steps",
    "",
    ...assessment.nextSteps.map((step) => `- ${step}`),
    "",
    "## Sources",
    "",
    ...assessment.sources.map(formatSource),
    "",
    "---",
    "",
    "Boundary of this document: preparation aid only. It contains no legally effective signature, no proof of submission, and no IRS acknowledgement. Keep your own evidence of however you file.",
    "",
  ];

  return {
    title,
    fileName: `${safeName}-${packageType}-${assessment.taxYear}-v${input.version}.md`,
    markdown: sections.join("\n"),
  };
}
