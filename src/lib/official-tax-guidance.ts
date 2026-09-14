import type { KnowledgeChunkMetadata } from "./knowledge";

type OfficialGuidanceSection = {
  source: string;
  sourceId: string;
  content: string;
  metadata: KnowledgeChunkMetadata;
};

function section(
  form: string,
  revision: string,
  slug: string,
  title: string,
  content: string,
  sourceUrl: string
): OfficialGuidanceSection {
  return {
    source: `IRS ${form} Instructions`,
    sourceId: `irs:${form.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${revision}:${slug}`,
    content,
    metadata: {
      kind: "irs",
      title: `IRS ${form} Instructions`,
      form,
      revision,
      section: title,
      sourceUrl,
      effectiveDate: revision,
    },
  };
}

const I5472 = "https://www.irs.gov/instructions/i5472";

const I1120 = "https://www.irs.gov/instructions/i1120";

const I1065 = "https://www.irs.gov/instructions/i1065";

const I1065K23 = "https://www.irs.gov/instructions/i1065s23";

const I8804 = "https://www.irs.gov/pub/irs-pdf/i8804.pdf";

const IW8BEN = "https://www.irs.gov/instructions/iw8ben";

const IW8BENE = "https://www.irs.gov/instructions/iw8bene";

const I1042 = "https://www.irs.gov/instructions/i1042";

const I1042S = "https://www.irs.gov/instructions/i1042s";

const IW7 = "https://www.irs.gov/instructions/iw7";

const ISS4 = "https://www.irs.gov/instructions/iss4";

export const OFFICIAL_TAX_GUIDANCE: OfficialGuidanceSection[] = [
  section(
    "Form 5472",
    "2024-12",
    "purpose-and-trigger",
    "Purpose; reporting corporation; who must file",
    "Form 5472 provides information required under sections 6038A and 6038C when reportable transactions occur during the tax year between a reporting corporation and a foreign or domestic related party. A reporting corporation includes a 25% foreign-owned U.S. corporation, including a foreign-owned U.S. disregarded entity, and a foreign corporation engaged in a U.S. trade or business. A reporting corporation generally files Form 5472 if it had a reportable transaction with a related party. A separate Form 5472 is filed for each related party with which reportable transactions occurred.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "foreign-owned-de",
    "Foreign-owned U.S. disregarded entities",
    "A foreign-owned U.S. disregarded entity is a domestic disregarded entity wholly owned by a foreign person. It is treated as separate from its owner and classified as a corporation only for the section 6038A reporting requirements. It files Form 5472 attached to a pro forma Form 1120 even though it otherwise has no income-tax-return filing requirement. Its tax year is the owner's U.S. tax filing year, or the calendar year if the owner has no U.S. tax filing year.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "pro-forma-1120",
    "Pro forma Form 1120 and special filing method",
    "For a foreign-owned U.S. disregarded entity, the only information completed on the pro forma Form 1120 is the entity name and address and items B and E on page 1. Write “Foreign-owned U.S. DE” across the top. The filing cannot be made electronically. Fax at 300 DPI or higher to 855-887-7737, or mail to Internal Revenue Service, 1973 Rulon White Blvd, M/S 6112 Attn: PIN Unit, Ogden, UT 84201. Do not use the regular Form 1120 mailing addresses.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "extension",
    "Extension of time to file",
    "A foreign-owned U.S. disregarded entity may request an extension by filing Form 7004 by the regular due date. Use the Form 1120 code in Part I, line 1, write “Foreign-owned U.S. DE” across the top of Form 7004, and use the same special fax number or Ogden mailing address used for the Form 5472 package rather than the normal Form 7004 address.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "penalties",
    "Penalties and records",
    "The failure-to-file penalty is $25,000 when Form 5472 is not filed when due and in the prescribed manner. A substantially incomplete Form 5472 is treated as a failure to file. Failure to maintain required records can also trigger the penalty. If failure continues for more than 90 days after IRS notice, an additional $25,000 applies for each related party for each 30-day period or part of a period after the 90-day period ends. Criminal penalties may also apply for false, fraudulent, or missing information.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "part-i",
    "Part I—Reporting corporation and cross-form totals",
    "All reporting corporations complete Part I. Line 1f reports the total value of foreign related-party transactions on that Form 5472. Line 1g reports the total number of Forms 5472 filed for the tax year. Line 1h reports the total value across all Forms 5472 filed for the tax year. Line 1j identifies the first year the U.S. reporting corporation filed Form 5472. Line 3 is checked when the reporting corporation is a foreign-owned U.S. disregarded entity.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "identifiers",
    "Part II—Foreign owner identifiers",
    "A foreign-owned U.S. disregarded entity reports its foreign owner in Part II. Enter a U.S. identifying number if any. A reference ID is required when no U.S. identifying number is entered, may contain only letters and numbers, may not contain spaces or special characters, is limited to 50 characters, and must be used consistently from year to year. A foreign-owned U.S. disregarded entity must enter the owner's FTIN if any; if there is no FTIN, enter “None” or “N/A.”",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "part-iii",
    "Part III—Related party",
    "All Form 5472 filers complete Part III even when the related party was already identified in Part II as a 25% foreign shareholder. Part III identifies whether the related party is foreign or domestic and records its name, address, identifiers, business activity, relationship, and countries of business and tax residence.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "part-iv",
    "Part IV—Monetary transactions",
    "Part IV reports monetary transactions with a foreign related party and is not completed for a domestic related party. Received categories include inventory and tangible-property sales, rents, royalties, intangible-property transactions, services, commissions, borrowings, interest, insurance premiums, guarantee fees, and other amounts. Paid categories include corresponding purchases and payments, amounts loaned, and other amounts paid. State amounts in U.S. dollars and attach a schedule showing exchange rates used. Accrual-method filers use accrued payments and receipts.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "estimates",
    "Reasonable estimates and small amounts",
    "When an actual amount is not determinable, a reasonable estimate may be used. An estimate is reasonable if it is at least 75% and not more than 125% of the actual amount required to be reported. If an actual amount in a transaction or series of transactions does not exceed $50,000, it may be reported as “$50,000 or less.”",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "parts-v-vi",
    "Parts V and VI—Other and nonmonetary transactions",
    "A foreign-owned U.S. disregarded entity checks Part V and attaches a statement for other transactions not already reported in Part IV. Explicit examples include amounts paid or received in connection with formation, dissolution, acquisition, disposition, contributions to the entity, and distributions from the entity. Part VI covers nonmonetary and less-than-full-consideration transactions with a foreign related party and requires a statement describing property, rights, obligations, services, and a reasonable value estimate when possible.",
    I5472
  ),
  section(
    "Form 5472",
    "2024-12",
    "part-vii",
    "Part VII—Additional information",
    "All reporting corporations complete Part VII. The questions cover imported goods, cost sharing, deductions disallowed under section 267A, FDII transactions, related-party loans and safe-haven rates, and specified covered debt instruments. The special debt-instrument questions identified in the instructions are not completed by a foreign-owned U.S. disregarded entity.",
    I5472
  ),
  section(
    "Form 1120",
    "2025",
    "purpose-who-files",
    "Purpose and who must file",
    "Form 1120 reports a corporation's income, gains, losses, deductions, credits, and income-tax liability. Domestic corporations generally file Form 1120 whether or not they have taxable income unless exempt. A domestic eligible entity that elected association status and C-corporation treatment generally files Form 1120. A multi-member LLC generally files Form 1065 unless it elected corporate treatment, and a single-member LLC is generally disregarded unless it elected corporate treatment.",
    I1120
  ),
  section(
    "Form 1120",
    "2025",
    "foreign-owned-de",
    "Foreign-owned domestic disregarded entity",
    "A foreign-owned domestic disregarded entity does not file a normal corporate income-tax return merely because of the section 6038A rules. It uses a pro forma Form 1120 with Form 5472 and follows the special Form 5472 instructions for the limited fields, filing method, and address.",
    I1120
  ),
  section(
    "Form 1120",
    "2025",
    "due-date",
    "When to file and extensions",
    "A corporation generally files by the 15th day of the fourth month after the end of its tax year. A corporation with a June 30 year end generally files by the 15th day of the third month after year end. If the due date is a Saturday, Sunday, or legal holiday, the next business day applies. Form 7004 requests an extension of time to file, but an extension does not extend the time to pay tax due.",
    I1120
  ),
  section(
    "Form 1120",
    "2025",
    "page-one",
    "Page 1 identifying information",
    "Page 1 asks for the entity name and address. Item B is the employer identification number. Item E identifies an initial return, final return, name change, or address change. For the foreign-owned U.S. disregarded entity pro forma filing, the Form 5472 instructions limit completion to name and address and items B and E.",
    I1120
  ),
  section(
    "Form 1120",
    "2025",
    "schedule-k-5472",
    "Schedule K—Foreign ownership and Form 5472",
    "Schedule K question 7 asks whether one foreign person owned directly or indirectly at least 25% of voting power or value during the tax year. If yes, the corporation reports ownership information and the number of Forms 5472 attached. This is relevant to a normal foreign-owned corporation, while a foreign-owned disregarded entity follows the limited pro forma procedure in the Form 5472 instructions.",
    I1120
  ),
  section(
    "Form 1065",
    "2025",
    "who-files",
    "Domestic partnerships and LLC classification",
    "Every domestic partnership generally files Form 1065 unless it neither receives income nor incurs expenditures treated as deductions or credits. A domestic LLC with at least two members is generally classified as a partnership and files Form 1065 unless it elected corporate treatment. A single-member LLC generally does not file Form 1065 solely because it is an LLC.",
    I1065
  ),
  section(
    "Form 1065",
    "2025",
    "due-date",
    "When to file and extensions",
    "A domestic partnership generally files Form 1065 by the 15th day of the third month after the end of the tax year. If that date is a Saturday, Sunday, or legal holiday, the next business day applies. Form 7004 requests an automatic extension and must be filed by the regular due date.",
    I1065
  ),
  section(
    "Form 1065",
    "2025",
    "k1",
    "Schedules K and K-1",
    "The partnership prepares and attaches a Schedule K-1 for every person who was a partner at any time during the tax year and generally furnishes it to the partner by the return due date. Form 1065 page 1 item I reports the number of Schedules K-1 attached. Schedule K reports partnership totals; each Schedule K-1 reports a partner's distributive share and partner-specific information.",
    I1065
  ),
  section(
    "Form 1065",
    "2025",
    "electronic-filing",
    "Electronic filing",
    "Partnerships generally must electronically file Form 1065 and related forms when they file 10 or more returns of any type during the tax year, and partnerships with more than 100 partners must e-file. The instructions describe hardship waivers, religious exemptions, and specified exclusions. Electronic partnership returns use the IRS Modernized e-File system through compatible software or an authorized provider.",
    I1065
  ),
  section(
    "Form 1065",
    "2025",
    "foreign-partners",
    "Foreign partners and international forms",
    "Form 1065 Schedule B asks whether the partnership has foreign partners and the number of Forms 8805 filed. Foreign partners can require review of section 1446 withholding and Forms 8804 and 8805, as well as Schedules K-2 and K-3 for international tax relevance. Form 5471 is not the default return for a multi-member U.S. LLC; Schedule B separately asks for Forms 5471 only when the partnership itself has a qualifying interest in a foreign corporation.",
    I1065
  ),
  section(
    "Form 1065",
    "2025",
    "penalties",
    "Partnership penalties",
    "The 2025 instructions state a late-filing penalty of $255 for each month or part of a month, up to 12 months, multiplied by the number of persons who were partners during any part of the year. Failure to furnish a correct Schedule K-1 or K-3 timely can trigger a separate per-schedule penalty, with higher amounts for intentional disregard.",
    I1065
  ),
  section(
    "Schedules K-2 and K-3 (Form 1065)",
    "2025",
    "purpose-and-foreign-partners",
    "International information for partnerships and partners",
    "Schedule K-2 extends Form 1065 Schedule K and reports partnership items of international tax relevance. Schedule K-3 extends Schedule K-1 and reports each partner's share. Partnerships with foreign partners generally require international reporting review. The domestic filing exception requires specified limited foreign activity, qualifying U.S. partners, partner notification, and no timely Schedule K-3 request; a partnership with foreign partners generally cannot assume that domestic exception applies.",
    I1065K23
  ),
  section(
    "Forms 8804, 8805, and 8813",
    "2026-01",
    "section-1446",
    "Partnership withholding for foreign partners",
    "A partnership with effectively connected taxable income allocable to a foreign partner generally has section 1446 withholding obligations. Form 8804 reports the partnership's annual withholding liability and transmits Forms 8805. Form 8805 reports the foreign partner's allocable effectively connected taxable income and withholding credit. Form 8813 is used for installment payments. These obligations depend on income, partner status, certifications, and applicable exceptions rather than foreign ownership alone.",
    I8804
  ),
  section(
    "Form W-8BEN",
    "2021-10",
    "foreign-individual-documentation",
    "Foreign individual status documentation",
    "A foreign individual provides Form W-8BEN to a withholding agent or payer to establish foreign status and, when applicable, claim treaty benefits. The form is given to the requester and is not generally filed directly with the IRS. The instructions include uses under chapters 3 and 4 and sections 1446(a) and 1446(f).",
    IW8BEN
  ),
  section(
    "Form W-8BEN-E",
    "2021-10",
    "foreign-entity-documentation",
    "Foreign entity status documentation",
    "A foreign entity may provide Form W-8BEN-E to establish foreign and chapter 4 status, beneficial ownership, or status as a foreign partner subject to section 1446. The form is provided to the requester rather than filed as an ordinary standalone IRS return.",
    IW8BENE
  ),
  section(
    "Form 1042",
    "2025",
    "withholding-return",
    "Annual return for foreign-person withholding",
    "A withholding agent that is required to file Forms 1042-S generally files one annual Form 1042 reconciling chapter 3 and chapter 4 payments and withholding. Form 1042 is not the return for ordinary non-publicly traded partnership section 1446(a) withholding on effectively connected taxable income, which generally uses Forms 8804 and 8805. Publicly traded partnership and broker section 1446 rules have separate Form 1042 reporting described in the instructions.",
    I1042
  ),
  section(
    "Form 1042-S",
    "2026",
    "foreign-payee-reporting",
    "U.S.-source payments to foreign persons",
    "Form 1042-S reports specified U.S.-source income paid to foreign persons and the associated chapter 3 or chapter 4 withholding. It is distinct from section 1446(a) partnership withholding on effectively connected taxable income, which uses Forms 8804 and 8805. A partnership must classify the payment and recipient before deciding between information-reporting regimes.",
    I1042S
  ),
  section(
    "Form W-7",
    "2024-12",
    "itin-eligibility-and-package",
    "ITIN applications for foreign individuals",
    "Form W-7 is for an individual who needs a U.S. taxpayer identification number for federal tax purposes and is not eligible for an SSN. A first-time application generally includes Form W-7, the U.S. federal tax return for which the ITIN is needed, and original identification documents or issuing-agency-certified copies, unless an exception applies. An ITIN is not required merely to own a U.S. LLC or to obtain the LLC's EIN.",
    IW7
  ),
  section(
    "Form SS-4",
    "2025-12",
    "international-fax",
    "International EIN applications by fax",
    "An applicant with no legal residence, principal place of business, or principal office in a U.S. state or the District of Columbia cannot use the online EIN application. It may fax Form SS-4 to 304-707-9471 when faxing from outside the United States or 855-215-1627 when faxing from within the United States. An applicant whose principal place of business is in a U.S. state or the District of Columbia uses 855-641-6935. Include a return fax number; the IRS states that a response is generally sent within 4 business days.",
    ISS4
  ),
  section(
    "Form SS-4",
    "2025-12",
    "foreign-owned-de-lines",
    "SS-4 entries for a foreign-owned U.S. disregarded entity",
    "For a responsible party without and ineligible for an SSN or ITIN, the SS-4 instructions permit “foreign” or “N/A” on line 7b. A foreign-owned U.S. disregarded entity requesting an EIN for Form 5472 purposes checks Other on line 9a and writes “Foreign-owned U.S. disregarded entity-Form 5472.” On line 10 it may enter “Foreign-owned U.S. disregarded entity filing Form 5472.” Apply only once for the entity, sign and date the form, and retain the fax confirmation.",
    ISS4
  ),
];
