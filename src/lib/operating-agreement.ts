import type { TaxMember } from "./tax-copilot";

export type OperatingAgreementProfile = {
  name: string;
  state: string;
  formationDate: string | null;
  entityType: string;
  taxClassification: string | null;
  registeredAgent?: string | null;
  businessPurpose?: string | null;
  members: TaxMember[];
};

function memberSection(profile: OperatingAgreementProfile) {
  if (profile.members.length === 0) {
    return "- [MEMBER LEGAL NAME], 100% membership interest, address: [ADDRESS]";
  }

  return profile.members
    .map(
      (member) =>
        `- ${member.name}, ${member.ownershipPct}% membership interest, country: ${member.country}, address: [ADDRESS]`
    )
    .join("\n");
}

function managementTerms(profile: OperatingAgreementProfile) {
  if (profile.entityType === "single-member") {
    return `The Company is member-managed. The sole Member has full authority to manage the Company, open and control financial accounts, enter contracts, appoint agents, and take other actions on behalf of the Company. The Member may document major decisions by written consent.`;
  }

  return `The Company is member-managed unless the Members adopt a written manager appointment. Ordinary business decisions require approval of Members holding more than 50% of the membership interests. Admission of a new member, amendment of this Agreement, merger, sale of substantially all assets, or voluntary dissolution requires unanimous written approval. These voting rules must be reviewed for the Members' intended commercial arrangement.`;
}

function allocationTerms(profile: OperatingAgreementProfile) {
  if (profile.entityType === "single-member") {
    return "All profits, losses, and distributions are allocated to the sole Member, subject to applicable law and the Company's federal tax classification.";
  }

  return "Profits, losses, and distributions are allocated in proportion to the membership percentages listed in this Agreement unless the Members adopt a lawful written amendment. Tax allocations must be reviewed for consistency with the Internal Revenue Code and the Members' economic arrangement.";
}

export function createOperatingAgreementDraft(
  profile: OperatingAgreementProfile
) {
  const effectiveDate = profile.formationDate ?? "[EFFECTIVE DATE]";

  const purpose =
    profile.businessPurpose?.trim() ||
    "engage in any lawful business for which a limited liability company may be organized in the State";

  const registeredAgent =
    profile.registeredAgent?.trim() || "[REGISTERED AGENT]";

  return `# OPERATING AGREEMENT OF ${profile.name.toUpperCase()}

**Educational starter draft — review with a licensed attorney in ${profile.state} before signing.** This document does not account for every state-specific rule, regulated activity, financing arrangement, tax election, or owner circumstance.

This Operating Agreement (the **“Agreement”**) is effective as of ${effectiveDate} and is adopted by the member or members listed below for ${profile.name} (the **“Company”**), a limited liability company organized under the laws of ${profile.state}.

## 1. Formation

The Company was formed by filing its formation document with the appropriate ${profile.state} filing office. The rights and obligations of the Members are governed by this Agreement and applicable ${profile.state} law.

## 2. Name and Principal Office

The Company's legal name is **${profile.name}**. Its principal office is **[PRINCIPAL OFFICE ADDRESS]**. The Company may maintain other offices as the Members determine.

## 3. Registered Agent

The Company's registered agent is **${registeredAgent}**, at the registered office shown in the Company's state records. The Company will keep this information current.

## 4. Purpose

The purpose of the Company is to ${purpose}, together with activities incidental or related to that purpose.

## 5. Members and Ownership

${memberSection(profile)}

The Members will update this section by signed written amendment whenever ownership changes.

## 6. Capital Contributions

Initial contributions are recorded in the Company's books. No Member is required to make an additional contribution unless agreed in writing. Contributions, owner-paid expenses, reimbursements, loans, and distributions must be separately documented.

## 7. Management and Authority

${managementTerms(profile)}

No person may represent that they have authority to bind the Company unless authorized under this Agreement or by written consent.

## 8. Banking and Company Funds

Company funds will be kept in accounts in the Company's legal name and will not be intentionally mixed with personal funds. Payments made personally for the Company must be documented as a contribution, loan, or reimbursable expense. Withdrawals must be recorded as business expenses, loan repayments, compensation where permitted, or distributions.

## 9. Books, Records, and Tax Information

The Company will maintain complete books and supporting documents, including formation records, this Agreement, EIN notices, bank statements, invoices, receipts, contracts, tax returns, owner transactions, and written consents. Records may be maintained electronically and will be available to the Members.

The Company's saved federal tax classification is **${profile.taxClassification ?? "[TAX CLASSIFICATION]"}**. This statement records the intended treatment but does not itself make a federal tax election. Required elections must be filed separately with the IRS.

## 10. Allocations and Distributions

${allocationTerms(profile)}

Distributions may be made when authorized and when they do not make the Company unable to pay its obligations. The Company will retain reasonable reserves for taxes, expenses, and liabilities.

## 11. Limited Liability

No Member is personally liable for Company obligations solely by reason of being a Member, except as required by applicable law, a personal guarantee, misconduct, or a separate written obligation.

## 12. Indemnification

To the fullest extent allowed by applicable law, the Company will indemnify a Member or authorized agent for actions taken in good faith on behalf of the Company. Indemnification does not apply to fraud, willful misconduct, knowing violation of law, or an improper personal benefit.

## 13. Transfers and New Members

A Member may not transfer governance rights or admit a new Member without the approvals required by this Agreement. A permitted transferee receives only the rights expressly transferred until admitted as a Member in writing.

## 14. Dissolution and Winding Up

The Company will dissolve upon an event requiring dissolution under applicable law or upon the written approval required by this Agreement. During winding up, the Company will collect assets, pay or reserve for liabilities, complete final tax and information returns, and distribute remaining assets according to positive economic interests and applicable law.

## 15. Amendments

Any amendment must be in writing and signed by the Member or Members whose approval is required under this Agreement.

## 16. Governing Law and Severability

This Agreement is governed by the laws of ${profile.state}. If a provision is unenforceable, the remaining provisions continue to the extent permitted by law.

## 17. Entire Agreement and Electronic Signatures

This Agreement and signed amendments contain the Members' agreement concerning the matters addressed here. Counterparts and electronic signatures may be used to the extent permitted by law.

---

## Signatures

The undersigned adopt this Operating Agreement as of ${effectiveDate}.

${profile.members.length ? profile.members.map((member) => `**${member.name}**\n\nSignature: ______________________________\n\nDate: ____________________`).join("\n\n") : "**[MEMBER LEGAL NAME]**\n\nSignature: ______________________________\n\nDate: ____________________"}
`;
}
