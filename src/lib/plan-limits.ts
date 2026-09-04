export type Plan = "starter" | "pro" | null;

const LIMITS = {
  none: {
    maxLlcs: 0,
    maxDocuments: 0,
    maxAssistantQueries: 0,
    whatsappReminders: false,
    collaborators: false,
    noticeTriage: false,
    documentIntelligence: false,
  },
  starter: {
    maxLlcs: 1,
    maxDocuments: 25,
    maxAssistantQueries: 10,
    whatsappReminders: false,
    collaborators: false,
    noticeTriage: false,
    documentIntelligence: false,
  },
  pro: {
    maxLlcs: 1,
    maxDocuments: Infinity,
    maxAssistantQueries: Infinity,
    whatsappReminders: true,
    collaborators: true,
    noticeTriage: true,
    documentIntelligence: true,
  },
} as const;

export function getPlanLimits(plan: Plan) {
  return LIMITS[plan ?? "none"];
}

