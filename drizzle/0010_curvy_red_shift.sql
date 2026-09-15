ALTER TABLE "jobs" ALTER COLUMN "payload" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "target_id" text;--> statement-breakpoint
UPDATE "jobs"
SET "target_id" = CASE
  WHEN "kind" = 'document.analyze' THEN ("payload"::jsonb)->>'documentId'
  WHEN "kind" = 'reminder.deliver' THEN ("payload"::jsonb)->>'reminderId'
  ELSE NULL
END
WHERE "target_id" IS NULL;--> statement-breakpoint
UPDATE "reminders"
SET "status" = 'delivery_unknown',
  "last_error" = 'This reminder was already marked as processing before durable delivery tracking was available. Check the provider before retrying.'
WHERE "status" = 'processing'
  AND NOT EXISTS (
    SELECT 1 FROM "jobs"
    WHERE "jobs"."kind" = 'reminder.deliver'
      AND "jobs"."target_id" = "reminders"."id"
  );