import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getChatModel } from "../src/lib/ai-config";
import { getDb } from "../src/lib/db";

// Synthetic prompts only. Run explicitly against the configured provider;
// this is a compatibility smoke test, not professional tax review.
try {
  const model = await getChatModel();
  let toolUsed = false;

  const result = await generateText({
    model,
    maxOutputTokens: 512,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(60_000),
    stopWhen: stepCountIs(3),
    prompt:
      "Call lookupDeadline for the test entity, then answer with the exact date and source ID returned. Do not guess.",
    tools: {
      lookupDeadline: tool({
        description: "Returns a synthetic filing deadline.",
        inputSchema: z.object({}),
        execute: async () => {
          toolUsed = true;

          return { date: "2026-04-15", source: "synthetic-source-1" };
        },
      }),
    },
  });

  const passed =
    toolUsed &&
    result.text.includes("2026-04-15") &&
    result.text.includes("synthetic-source-1");

  console.log(
    JSON.stringify({
      evaluation: "tool-followup-with-source",
      passed,
      steps: result.steps.length,
    })
  );

  if (!passed) process.exitCode = 1;
} catch {
  console.error(
    "Provider compatibility evaluation failed. Inspect configuration without logging provider payloads."
  );
  process.exitCode = 1;
} finally {
  await getDb().$client.end();
}
