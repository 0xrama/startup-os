import { z } from "zod";
import {
  isSealedText,
  openText,
  sealText,
} from "../security/server-encryption";

export const jobPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("document.analyze"),
    documentId: z.string(),
    stagingKey: z.string(),
    encryptedMetadata: z.string(),
  }),
  z.object({ type: z.literal("object.delete"), key: z.string() }),
  z.object({ type: z.literal("reminder.deliver"), reminderId: z.string() }),
]);

export type JobPayload = z.infer<typeof jobPayloadSchema>;

const storedJobPayloadSchema = z.union([z.string(), jobPayloadSchema]);

export function sealJobPayload(payload: JobPayload) {
  return sealText(JSON.stringify(payload));
}

export function openJobPayload(payload: string | JobPayload): JobPayload {
  const stored = storedJobPayloadSchema.parse(payload);
  const text = z.string().safeParse(stored);

  if (text.success) {
    return jobPayloadSchema.parse(
      JSON.parse(isSealedText(text.data) ? openText(text.data) : text.data)
    );
  }

  return jobPayloadSchema.parse(stored);
}

export function jobTargetId(payload: JobPayload) {
  return payload.type === "document.analyze"
    ? payload.documentId
    : payload.type === "reminder.deliver"
      ? payload.reminderId
      : null;
}

export const claimedJobSchema = z
  .object({
    id: z.string(),
    payload: z.unknown(),
    attempts: z.number(),
    max_attempts: z.number(),
    lease_token: z.string(),
  })
  .transform((row) => ({
    ...row,
    payload: openJobPayload(storedJobPayloadSchema.parse(row.payload)),
  }));

export type ClaimedJob = z.infer<typeof claimedJobSchema>;

export const JOB_LEASE_MS = 300_000;

export function retryDelayMs(attempt: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}
