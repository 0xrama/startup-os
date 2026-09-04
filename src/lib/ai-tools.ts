import { tool } from "ai";
import { z } from "zod";
import { db } from "./db";
import { complianceTasks, documents } from "./schema";
import { eq } from "drizzle-orm";
import { getLlcAccess } from "./access";
import { getVisibleTasks } from "./compliance-task-details";
import { getDocumentSearchResults, searchKnowledgeBase, toCitation } from "./knowledge";

export function createAssistantTools(userId: string, llcId?: string) {
  return {
    getLlcProfile: tool({
      description:
        "Get the user's entity profile including entity type, founder residency, state, EIN status, tax classification, members, and filing preferences.",
      inputSchema: z.object({
        llcId: z.string().optional().describe("Specific LLC ID, or uses the current context LLC"),
      }),
      execute: async ({ llcId: targetId }) => {
        const id = targetId || llcId;
        if (!id) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, id);
        const llc = access?.llc;

        if (!llc) return { error: "LLC not found" };

        return {
          name: llc.name,
          state: llc.state,
          entityType: llc.entityType,
          ownerResidency: llc.ownerResidency,
          taxClassification: llc.taxClassification,
          einStatus: llc.einStatus,
          taxYearEnd: llc.taxYearEnd,
          formationDate: llc.formationDate,
          registeredAgent: llc.registeredAgent,
          raRenewalDate: llc.raRenewalDate,
          members: llc.members,
        };
      },
    }),

    getUpcomingTasks: tool({
      description:
        "Get upcoming compliance tasks and deadlines for the user's LLC. Returns tasks sorted by due date.",
      inputSchema: z.object({
        llcId: z.string().optional(),
        includeCompleted: z.boolean().optional().default(false),
      }),
      execute: async ({ llcId: targetId, includeCompleted }) => {
        const id = targetId || llcId;
        if (!id) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, id);
        const llc = access?.llc;
        if (!llc) return { error: "LLC not found" };

        let tasks = await db
          .select()
          .from(complianceTasks)
          .where(eq(complianceTasks.llcId, id));

        tasks = getVisibleTasks(tasks);

        if (!includeCompleted) {
          tasks = tasks.filter((t) => t.status !== "completed");
        }

        tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        return {
          llcName: llc.name,
          tasks: tasks.map((t) => ({
            title: t.title,
            description: t.description,
            category: t.category,
            dueDate: t.dueDate,
            status: t.status,
            recurring: t.recurring,
          })),
        };
      },
    }),

    searchDocuments: tool({
      description:
        "Search the user's uploaded documents by name or category. Useful for finding specific records like EIN letters, operating agreements, or tax returns.",
      inputSchema: z.object({
        llcId: z.string().optional(),
        query: z.string().optional().describe("Search term to match document names"),
        category: z
          .enum([
            "operating_agreement",
            "ein_letter",
            "tax_return",
            "notice",
            "invoice",
            "compliance",
            "other",
          ])
          .optional(),
      }),
      execute: async ({ llcId: targetId, query, category }) => {
        const id = targetId || llcId;
        if (!id) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, id);
        const llc = access?.llc;
        if (!llc) return { error: "LLC not found" };

        let docs = query
          ? await getDocumentSearchResults(id, query)
          : await db.select().from(documents).where(eq(documents.llcId, id));

        if (category) {
          docs = docs.filter((d) => d.category === category);
        }

        if (query) {
          const q = query.toLowerCase();
          docs = docs.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.description?.toLowerCase().includes(q)
          );
        }

        return {
          llcName: llc.name,
          documents: docs.map((d) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            taxYear: d.taxYear,
            uploadedAt: d.createdAt?.toISOString(),
            summary: d.extractedMetadata?.summary,
          })),
        };
      },
    }),

    searchKnowledgeBase: tool({
      description:
        "Search IRS guidance, state guidance, and uploaded document text. Returns source-backed excerpts and citations.",
      inputSchema: z.object({
        query: z.string().min(3),
        llcId: z.string().optional(),
      }),
      execute: async ({ query, llcId: targetId }) => {
        const id = targetId || llcId;
        if (id) {
          const access = await getLlcAccess(userId, id);
          if (!access?.llc) return { error: "LLC not found" };
        }

        const results = await searchKnowledgeBase({
          query,
          llcId: id,
        });

        return {
          results: results.map((result) => ({
            content: result.content,
            source: result.source,
            metadata: result.metadata,
            citation: toCitation(result),
          })),
        };
      },
    }),

    getFilingInstructions: tool({
      description:
        "Get filing instructions and guidance for a specific form or compliance task. Returns general instructions based on the form type.",
      inputSchema: z.object({
        formName: z
          .string()
          .describe(
            'The form or filing name, e.g., "Form 5472", "Annual Report", "FBAR", "Form 1065", "BOI Report"'
          ),
        state: z.string().optional().describe("State code if state-specific, e.g., WY, FL, DE"),
      }),
      execute: async ({ formName, state }) => {
        const instructions: Record<string, { overview: string; steps: string[]; tips: string[] }> = {
          "Form 1120": {
            overview:
              "Form 1120 is the U.S. Corporation Income Tax Return for domestic corporations and certain entities that elected to be taxed as corporations. It is not the default annual return for every LLC.",
            steps: [
              "Confirm the entity's federal tax classification first: C corporation, S corporation, partnership, disregarded entity, or LLC that elected corporate treatment on Form 8832.",
              "If the entity is a domestic corporation or an LLC taxed as a corporation, prepare Form 1120 and any required schedules.",
              "File by the 15th day of the 4th month after the tax year ends, unless the corporation has a June 30 year end, which uses the 15th day of the 3rd month.",
              "If more time is needed to file, submit Form 7004 by the original due date. The extension does not extend time to pay tax due.",
              "Pay any balance due electronically and review whether estimated tax payments, Form 2220, Schedule M-3, Form 5472, or Form 8832 are also required.",
            ],
            tips: [
              "A multi-member LLC usually files Form 1065 unless it elected corporate tax treatment.",
              "A foreign-owned domestic disregarded entity often files Form 5472 with a pro forma Form 1120 instead of a regular corporate income tax return.",
              "Corporations that expect total tax of $500 or more generally need estimated tax installments.",
              "For returns required to be filed in 2026, the minimum late-filing penalty can be the smaller of the tax due or $525 if the return is more than 60 days late.",
            ],
          },
          "Form 5472": {
            overview:
              "Form 5472 is an information return for a 25% foreign-owned U.S. corporation, including many foreign-owned U.S. disregarded entities, and for certain foreign corporations engaged in a U.S. trade or business. For a foreign-owned U.S. disregarded entity, it is generally attached to a pro forma Form 1120.",
            steps: [
              "Confirm first that the entity is a reporting corporation, such as a 25% foreign-owned U.S. corporation or a foreign-owned U.S. disregarded entity with reportable transactions.",
              "Complete Part I for the reporting corporation and Part II for the 25% foreign shareholder information when applicable.",
              "Complete Part III for the related party and report monetary, nonmonetary, and foreign-owned disregarded entity transactions in Parts IV, V, and VI as applicable.",
              "If this is a foreign-owned U.S. disregarded entity, attach Form 5472 to a pro forma Form 1120 and use the special IRS filing path in the instructions rather than the normal Form 1120 mailing address.",
              "File by the due date of the underlying return, including extensions. For a foreign-owned U.S. disregarded entity, Form 7004 can be used to request an extension using the Form 1120 code.",
              "Prepare a separate Form 5472 for each related party that had reportable transactions.",
            ],
            tips: [
              "Capital contributions, distributions, owner-paid expenses, reimbursements, loans, formation transactions, and dissolution transactions can all be reportable for a foreign-owned U.S. disregarded entity.",
              "Even if the entity had no income, Form 5472 can still be required if reportable transactions occurred.",
              "A substantially incomplete filing can be treated the same as not filing at all.",
              "The penalty is generally $25,000 per failure, with additional penalties if the failure continues after IRS notice.",
            ],
          },
          "Form 1065": {
            overview:
              "Form 1065 is the U.S. Return of Partnership Income. It is generally the annual information return for domestic partnerships and multi-member LLCs taxed as partnerships.",
            steps: [
              "Confirm the entity is classified as a partnership for federal tax purposes, such as a domestic multi-member LLC that did not elect corporate treatment on Form 8832.",
              "Complete Form 1065 and prepare a separate Schedule K-1 for each person who was a partner during the year.",
              "File by the 15th day of the 3rd month after the tax year ends. For a 2025 calendar-year partnership, the due date is March 16, 2026.",
              "If more time is needed, file Form 7004 by the original due date. Form 7004 for Form 1065 can be electronically filed.",
              "If the partnership is subject to mandatory e-filing, submit Form 1065, K-1s, and related forms through an IRS-authorized e-file provider or compatible business tax software using the Modernized e-File system.",
            ],
            tips: [
              "Beginning in 2024, partnerships generally must e-file if they file 10 or more returns of any type during the year, and partnerships with more than 100 partners must e-file.",
              "Each partner generally must receive Schedule K-1 by the day the return is due.",
              "Foreign partners may trigger withholding and international reporting obligations, including K-2 and K-3 in some cases.",
              "Late filing penalty under the 2025 instructions is generally $255 per month per partner, up to 12 months.",
            ],
          },
          FBAR: {
            overview:
              "FinCEN 114 (FBAR) reports foreign financial accounts if aggregate value exceeds $10,000 at any point during the year.",
            steps: [
              "Determine if you have signature authority over foreign accounts",
              "Calculate maximum account values during the year",
              "File electronically through the BSA E-Filing System",
              "Due April 15 with automatic extension to October 15",
            ],
            tips: [
              "This is filed with FinCEN, not the IRS",
              "Willful failure to file can result in severe penalties",
              "Each account must be reported separately",
            ],
          },
          "Annual Report": {
            overview: `Annual report / franchise tax filing required by the state of formation.${state ? ` For ${state}, check the Secretary of State website for current fees and forms.` : ""}`,
            steps: [
              "Check your state's Secretary of State website for the current form",
              "Update registered agent information if changed",
              "Pay the required filing fee",
              "File online through the state portal if available",
            ],
            tips: [
              "Missing the annual report can lead to administrative dissolution",
              "Most states allow online filing",
              "Wyoming annual report fee is based on assets in the state (minimum $60)",
              "Some states (like New Mexico) do not require annual reports",
            ],
          },
          "BOI Report": {
            overview:
              "Beneficial Ownership Information (BOI) report required by FinCEN under the Corporate Transparency Act.",
            steps: [
              "Confirm first that the company is still a reporting company under the current FinCEN rule before preparing a BOI filing.",
              "If the company is reportable, identify all beneficial owners (25%+ ownership or substantial control).",
              "Gather the required information for the company and each reportable person.",
              "File electronically through the FinCEN BOI portal if the rule still applies to that entity.",
              "Review the latest filing and update deadlines directly from FinCEN before submitting.",
            ],
            tips: [
              "As of 2025, FinCEN narrowed BOI reporting so U.S. companies and U.S. persons are generally not subject to the reporting requirement.",
              "Foreign reporting companies should verify whether they remain covered before assuming BOI is required.",
              "Penalties for non-compliance can still be significant when a filing is actually required.",
            ],
          },
        };

        const key = Object.keys(instructions).find((k) =>
          formName.toLowerCase().includes(k.toLowerCase())
        );

        if (key) {
          return {
            formName: key,
            ...instructions[key],
            disclaimer:
              "This is general informational guidance, not legal or tax advice. Consult a qualified professional for your specific situation.",
          };
        }

        return {
          formName,
          overview: `I don't have detailed instructions for "${formName}" in my current knowledge base. Please consult the IRS website (irs.gov) or your state's Secretary of State website for official instructions.`,
          steps: [],
          tips: [],
          disclaimer:
            "This is general informational guidance, not legal or tax advice.",
        };
      },
    }),
  };
}
