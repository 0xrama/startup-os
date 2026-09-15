import type { createAssistantTools } from "@/lib/ai-tools";

type AssistantToolName = keyof ReturnType<typeof createAssistantTools>;

// What the pending indicator says while each assistant tool runs. Keys are the
// tool names in src/lib/ai-tools.ts; the `satisfies` check and a unit test
// keep the two in sync.
export const TOOL_ACTIVITY_LABELS = {
  getLlcProfile: "Reading the saved entity profile",
  getUpcomingTasks: "Checking the compliance calendar",
  searchDocuments: "Looking through uploaded documents",
  searchKnowledgeBase: "Searching IRS and state guidance",
  assessLlcWellness: "Running the wellness check",
  getEinFaxGuide: "Loading the EIN fax guide",
  draftOperatingAgreement: "Drafting the operating agreement",
  assessFederalTaxFiling: "Assessing the federal filing route",
  classify5472Transaction: "Classifying the transaction for Form 5472",
  getFilingInstructions: "Loading filing instructions",
} satisfies Record<AssistantToolName, string>;

function isKnownTool(toolName: string): toolName is AssistantToolName {
  return Object.hasOwn(TOOL_ACTIVITY_LABELS, toolName);
}

export function describeToolActivity(toolName: string) {
  return isKnownTool(toolName)
    ? TOOL_ACTIVITY_LABELS[toolName]
    : "Gathering details";
}
