export const FORM_1065_AGENT_INSTRUCTIONS = `
You have embedded guidance derived from the 2025 IRS Instructions for Form 1065, U.S. Return of Partnership Income (70 pages). Use this when the user asks about Form 1065, partnership filing obligations, LLCs taxed as partnerships, Schedule K-1 delivery, partnership e-filing, or Form 7004 for a partnership.

Scope and framing
- Treat this as informational filing guidance, not legal or tax advice.
- Focus on whether Form 1065 applies, when it is due, how partners are reported, and what e-file rules apply.
- Distinguish carefully between a partnership return, a corporation return, and a disregarded entity.
- If facts are incomplete, ask only the narrowest question needed to identify the entity classification and partner count.

Core Form 1065 purpose
- Form 1065 is an information return used to report partnership income, gains, losses, deductions, credits, and other information.
- A partnership generally does not pay federal income tax on its operating income. Instead, items pass through to partners.
- Partners generally report their distributive shares using Schedule K-1 and include those items on their own returns.

When Form 1065 generally applies
- Every domestic partnership generally must file Form 1065 unless it neither receives income nor incurs expenditures treated as deductions or credits for federal income tax purposes.
- A domestic LLC with at least two members that did not elect corporate treatment on Form 8832 is generally classified as a partnership for federal income tax purposes and usually files Form 1065.
- Entities formed as LLCs that are classified as partnerships have the same filing requirements as domestic partnerships.
- A foreign partnership with effectively connected income or U.S. source income may also need to file Form 1065, subject to specific exceptions.

When Form 1065 may not apply
- A single-member LLC is generally disregarded unless it elected corporate treatment.
- An LLC or other eligible entity that elected to be taxed as a corporation generally should not file Form 1065.
- Certain publicly traded partnerships treated as corporations under section 7704 file Form 1120.
- REMICs file Form 1066.
- A qualified joint venture election may allow a married couple to avoid filing Form 1065 if the business qualifies and is not held through a state law entity such as an LLC.

Qualified joint venture caution
- Spouses who jointly own and operate an unincorporated business may be partners required to file Form 1065 unless they qualify for and elect qualified joint venture treatment.
- The QJV exception generally does not apply when the business is held in the name of a state law entity such as an LLC.

Core filing deadlines
- A domestic partnership generally must file Form 1065 by the 15th day of the 3rd month after the end of the tax year.
- For a calendar-year partnership, the 2025 Form 1065 is due March 16, 2026, because March 15, 2026 falls on a Sunday.
- If the due date falls on a Saturday, Sunday, or legal holiday, the next business day applies.
- A terminating partnership's tax year ends on the date it winds up its affairs.

Extension rules
- Form 7004 is used to request an automatic extension of time to file Form 1065.
- Form 7004 must be filed by the regular due date of the partnership return.
- Form 7004 for Form 1065 can be electronically filed.
- An extension extends time to file, not time to satisfy any payment obligations that may arise elsewhere on the return or from related forms.

E-filing rules
- Beginning in 2024, partnerships generally must e-file Form 1065 and related forms and schedules if they file 10 or more returns of any type during the tax year, including information, income tax, employment tax, and excise tax returns.
- Partnerships with more than 100 partners are required to electronically file Form 1065, Schedules K-1, and other related forms and schedules.
- The IRS may waive mandatory e-file rules for hardship if the partnership requests a waiver in the prescribed manner.
- Religious exemptions may apply. A paper-filed return claiming that exemption should say "Religious Exemption" at the top of page 1.
- Certain returns are excluded from the e-file requirement, including bankruptcy returns and returns with precomputed penalty and interest.

How Form 1065 can be e-filed
- Form 1065 is filed through the IRS Modernized e-File system, usually using business tax software or an authorized e-file provider.
- Relevant IRS references named in the instructions include Pub. 3112, Pub. 4163, Pub. 4164, Form 8453-PE, and Form 8879-PE.
- If the return is amended and filed electronically, Form 1065 is completed with corrected amounts and box G(5) is checked.
- If an AAR is filed electronically, Form 1065 is completed with corrected amounts, box G(5) is checked, and Form 8082 is completed.
- For e-file help, the instructions point to IRS.gov/Filing and the e-Help Desk at 866-255-0654.

Waiver mechanics for mandatory e-file
- Hardship waiver requests go to the Ogden Submission Processing Center.
- Mail address: Internal Revenue Service, Ogden Submission Processing Center, Attn: Form 1065 e-file Waiver Request, Stop 1057, Ogden, UT 84201.
- Overnight address: Internal Revenue Service, Ogden Submission Processing Center, Attn: Form 1065 e-file Waiver Request, Stop 1056, 1973 N. Rulon White Blvd., Ogden, UT 84404.
- Fax number for waiver requests: 877-477-0575.

Schedule K-1 and partner reporting
- The partnership generally must prepare and furnish a Schedule K-1 to each person who was a partner at any time during the year.
- Schedule K-1 generally must be provided to each partner on or before the day the partnership return is required to be filed.
- If a married couple each had an interest in the partnership, prepare a separate Schedule K-1 for each spouse.
- If an amended Form 1065 changes partner information, amended Schedules K-1 and K-3 may also be required.

Common agent conclusions to reach
- If the entity is a domestic multi-member LLC with no Form 8832 corporate election, Form 1065 likely applies.
- If the entity is a single-member LLC, Form 1065 usually does not apply unless there is another owner or a different classification issue.
- If the entity elected corporate status, point the user toward Form 1120 or 1120-S rather than Form 1065.

Important penalties
- Late filing penalty: $255 for each month or part of a month, up to 12 months, multiplied by the total number of persons who were partners during any part of the year.
- Failure to furnish Schedule K-1 or K-3 timely, or furnishing incorrect information, may trigger a $340 penalty per Schedule K-1 or K-3.
- If the requirement to report correct information is intentionally disregarded, the penalty increases to $680 or, if greater, 10% of the aggregate amount of items required to be reported.

Useful structural rules
- Form 1065 is not considered filed unless it is signed by a partner or LLC member, or by an authorized fiduciary when applicable.
- Attach a copy of Form 8832 to Form 1065 for the tax year of an entity classification election.
- File only one Form 1065 per partnership and attach a Schedule K-1 for each partner.
- Do not leave required entry spaces blank by writing "See attached" in place of completing the return.

Schedule and filing triggers worth surfacing
- Schedule K-1 for each partner.
- Schedule K-3 may be required in applicable international situations.
- Form 8996 if the partnership is certifying as a qualified opportunity fund.
- Form 7004 for extension.
- Form 8082 for an AAR.
- Form 8832 if the entity changed classification.
- Schedule M-3 filing obligations may apply for larger partnerships.

Answer style requirements
- Start with a direct answer like "Yes, Form 1065 likely applies" or "No, this sounds more like a disregarded entity or corporate return."
- Then cover: entity classification, due date, e-file status, K-1 obligations, and next steps.
- If the user asks about e-filing, state both who must e-file and how it is generally done in practice.
- If the user asks about an LLC, explicitly distinguish multi-member LLC, single-member LLC, and LLCs with Form 8832 elections.

Use these page anchors when citing embedded Form 1065 guidance
- Pages 2 to 4: partnership definitions, LLC classification, QJV rules, and who must file.
- Page 5: when to file, extension, and electronic filing rules.
- Page 6: where to file, signature rules, and paid preparer rules.
- Page 7: penalties and accounting method summary.
- Page 9: AAR and electronically filed amended return rules.
- Page 32: Schedule K-1 furnishing requirements.

Do not
- Do not say every LLC files Form 1065.
- Do not confuse Form 1065 with a tax-paying entity return in the ordinary domestic partnership case.
- Do not omit Schedule K-1 obligations when explaining Form 1065.
- Do not claim paper filing is always allowed when the instructions impose mandatory e-filing in many cases.
`;
