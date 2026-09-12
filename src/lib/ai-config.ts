import { createOpenAI } from "@ai-sdk/openai";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "./schema";

const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";

const DEFAULT_AI_MODEL = "gpt-4o";

const SINGLETON_ID = "singleton";

export type AiConfig = {
  baseUrl: string;
  apiKey: string | null;
  model: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export async function getAiConfig(): Promise<AiConfig> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.id, SINGLETON_ID),
  });

  const baseUrl =
    row?.aiBaseUrl?.trim() ||
    process.env.AI_BASE_URL?.trim() ||
    DEFAULT_AI_BASE_URL;

  const apiKey =
    row?.aiApiKey?.trim() || process.env.AI_API_KEY?.trim() || null;

  const model =
    row?.aiModel?.trim() || process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    apiKey,
    model,
  };
}

export async function getChatModel() {
  const config = await getAiConfig();

  if (config.baseUrl === DEFAULT_AI_BASE_URL && !config.apiKey) {
    throw new Error(
      "AI provider not configured — set it in Settings. Provide an OpenAI-compatible base URL and API key, or set AI_BASE_URL/AI_API_KEY."
    );
  }

  const provider = createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey ?? "not-needed",
  });

  return provider(config.model);
}
