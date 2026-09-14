import { tool } from "ai";
import { z } from "zod";
import { db } from "./db";
import { complianceTasks, documents } from "./schema";
import { eq } from "drizzle-orm";
import { getLlcAccess } from "./access";
import { getVisibleTasks } from "./compliance-task-details";
import {
  getDocumentSearchResults,
  searchKnowledgeBase,
  toCitation,
} from "./knowledge";
import { assessFederalTaxFiling, classify5472Transaction } from "./tax-copilot";
import { assessLlcWellness, getEinFaxGuide } from "./llc-wellness";
import { createOperatingAgreementDraft } from "./operating-agreement";
import type { SecureLlcPayload } from "./secure-llc";

type SecureEntityContext = Partial<SecureLlcPayload>;

export function createAssistantTools(
  userId: string,
  llcId?: string,
  secureEntityContext?: SecureEntityContext
) {
  return {
    getLlcProfile: tool({
      description:
        "Get the user's entity profile including entity type, founder residency, state, EIN status, tax classification, members, and filing preferences.",
      inputSchema: z.object({
        llcId: z
          .string()
          .optional()
          .describe("Specific LLC ID, or uses the current context LLC"),
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
          ownersAreIndividuals: llc.ownersAreIndividuals,
          ownershipIsDirect: llc.ownershipIsDirect,
          ownerCount: llc.ownerCount,
          foreignOwnerCount: llc.foreignOwnerCount,
          usOwnerCount: llc.usOwnerCount,
          taxClassification: llc.taxClassification,
          einStatus: llc.einStatus,
          taxYearEnd: llc.taxYearEnd,
          formationDate: llc.formationDate,
          registeredAgent: llc.registeredAgent,
          raRenewalDate: llc.raRenewalDate,
          members: secureEntityContext?.members ?? llc.members,
          ein: secureEntityContext?.ein ?? llc.ein,
          wellnessProfile: llc.wellnessProfile,
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
        query: z
          .string()
          .optional()
          .describe("Search term to match document names"),
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

    assessLlcWellness: tool({
      description:
        "Run an LLC wellness check using the saved entity profile, operating status, EIN status, operating-agreement documents, banking, bookkeeping, staffing, sales-tax, and other-state activity signals.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!llcId) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, llcId);
        const llc = access?.llc;

        if (!llc) return { error: "LLC not found" };

        const [llcDocuments, llcTasks] = await Promise.all([
          db
            .select({ name: documents.name, category: documents.category })
            .from(documents)
            .where(eq(documents.llcId, llcId)),
          db
            .select({
              title: complianceTasks.title,
              dueDate: complianceTasks.dueDate,
              status: complianceTasks.status,
            })
            .from(complianceTasks)
            .where(eq(complianceTasks.llcId, llcId)),
        ]);

        return assessLlcWellness({
          profile: {
            ...llc,
            ein: secureEntityContext?.ein ?? llc.ein,
            members: secureEntityContext?.members ?? llc.members,
          },
          wellness: llc.wellnessProfile ?? {},
          documents: llcDocuments,
          tasks: llcTasks,
        });
      },
    }),

    getEinFaxGuide: tool({
      description:
        "Get the current IRS Form SS-4 fax process for an LLC with a non-U.S. owner, including the correct fax-number decision and foreign-owned disregarded-entity line notes.",
      inputSchema: z.object({
        principalPlaceOfBusiness: z
          .enum(["us", "outside_us", "unsure"])
          .optional(),
      }),
      execute: async ({ principalPlaceOfBusiness }) => {
        if (!llcId) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, llcId);
        const llc = access?.llc;

        if (!llc) return { error: "LLC not found" };

        return getEinFaxGuide({
          profile: {
            ...llc,
            ein: secureEntityContext?.ein ?? llc.ein,
            members: secureEntityContext?.members ?? llc.members,
          },
          principalPlaceOfBusiness:
            principalPlaceOfBusiness ??
            llc.wellnessProfile?.principalPlaceOfBusiness,
        });
      },
    }),

    draftOperatingAgreement: tool({
      description:
        "Create an educational starter operating-agreement draft from the saved LLC and owner profile. The draft must be reviewed for state-specific legal requirements before signing.",
      inputSchema: z.object({
        businessPurpose: z.string().max(2_000).optional(),
      }),
      execute: async ({ businessPurpose }) => {
        if (!llcId) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, llcId);
        const llc = access?.llc;

        if (!llc) return { error: "LLC not found" };

        return {
          fileName: `${llc.name}-operating-agreement-draft.md`,
          draft: createOperatingAgreementDraft({
            name: llc.name,
            state: llc.state,
            formationDate: llc.formationDate,
            entityType: llc.entityType,
            taxClassification: llc.taxClassification,
            registeredAgent:
              secureEntityContext?.registeredAgent ?? llc.registeredAgent,
            businessPurpose:
              businessPurpose ?? llc.wellnessProfile?.businessDescription,
            members: secureEntityContext?.members ?? llc.members ?? [],
          }),
          disclaimer:
            "Educational starter draft only. Review with a licensed attorney in the formation state before signing.",
        };
      },
    }),

    assessFederalTaxFiling: tool({
      description:
        "Assess the LLC's primary federal filing route from the saved entity type, owner tax status, tax classification, tax year, and members. Use this before asking the user to repeat facts already stored in the profile.",
      inputSchema: z.object({
        taxYear: z.number().int().min(2017).max(2100).optional(),
      }),
      execute: async ({ taxYear }) => {
        if (!llcId) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, llcId);
        const llc = access?.llc;

        if (!llc) return { error: "LLC not found" };

        return assessFederalTaxFiling(
          {
            ...llc,
            ein: secureEntityContext?.ein ?? llc.ein,
            members: secureEntityContext?.members ?? llc.members,
          },
          { taxYear }
        );
      },
    }),

    classify5472Transaction: tool({
      description:
        "Classify a possible owner or foreign-related-party transaction into Form 5472 Part IV, V, or VI and suggest a Part IV line when supported. Treat the result as a review aid, not a final tax determination.",
      inputSchema: z.object({
        description: z.string().min(3),
        direction: z.enum(["received", "paid", "unknown"]).default("unknown"),
      }),
      execute: async ({ description, direction }) => {
        if (!llcId) return { error: "No LLC specified" };

        const access = await getLlcAccess(userId, llcId);
        const llc = access?.llc;

        if (!llc) return { error: "LLC not found" };

        const assessment = assessFederalTaxFiling({
          ...llc,
          ein: secureEntityContext?.ein ?? llc.ein,
          members: secureEntityContext?.members ?? llc.members,
        });

        if (assessment.route !== "foreign_owned_disregarded_entity") {
          return {
            error:
              "Form 5472 transaction classification is only available for a confirmed supported foreign-owned disregarded entity.",
            scopeReasons: assessment.reasons,
          };
        }

        return classify5472Transaction({ description, direction });
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
        state: z
          .string()
          .optional()
          .describe("State code if state-specific, e.g., WY, FL, DE"),
      }),
      execute: async ({ formName, state }) => {
        type FormInstructions = {
          overview: string;
          steps: string[];
          tips: string[];
        };

        const instructions = {
          "Form 1120": {
            overview:
              "Pax supports Form 1120 only as the limited pro forma cover return attached to Form 5472 for a supported foreign-owned U.S. disregarded entity. Normal corporation returns and LLC corporate-tax elections are outside the supported scope.",
            steps: [
              "Confirm that the saved filing assessment is the foreign-owned disregarded-entity Form 5472 route.",
              "Prepare the limited pro forma Form 1120 fields required by the current Form 5472 instructions.",
              "Attach the completed Form 5472 and any required statements.",
              "Download and review the draft before following the current IRS filing instructions. Pax does not transmit the filing.",
            ],
            tips: [
              "Do not use this workflow for a normal Form 1120 corporation return.",
              "A foreign-owned domestic disregarded entity may need Form 5472 even when it had no income if it had reportable transactions.",
              "Keep proof of the filing method used outside Pax.",
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
              "Download and review the draft package, then follow the current IRS filing instructions or use an outside tax professional or filing provider. Pax does not transmit the return.",
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
            overview:
              state === "WY"
                ? "Pax can remind a Wyoming LLC to review and pay its annual report license tax. Pax does not prepare or submit the state filing."
                : "State annual-report automation is outside Pax's current supported scope. Check the formation state's official website or consult a qualified professional.",
            steps: [
              "For a Wyoming LLC, check the Wyoming Secretary of State website for the current report and fee.",
              "Review the entity and registered-agent information.",
              "Pay and submit directly through the official state process.",
            ],
            tips: [
              "The reminder is optional and is not proof that the state filing was completed.",
              "Verify the current due date and fee with Wyoming before submitting.",
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
        } satisfies Record<string, FormInstructions>;

        const match = Object.entries(instructions).find(([form]) =>
          formName.toLowerCase().includes(form.toLowerCase())
        );

        if (match) {
          const [key, instruction] = match;

          return {
            formName: key,
            ...instruction,
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
