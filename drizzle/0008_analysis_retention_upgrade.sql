-- No historical consent is inferred. Stop retrieval immediately through the
-- application consent filter and let the worker expire legacy extracted data.
UPDATE documents SET analysis_expires_at = now()
WHERE analysis_expires_at IS NULL
  AND (extracted_metadata IS NOT NULL OR EXISTS (
    SELECT 1 FROM knowledge_chunks WHERE knowledge_chunks.document_id = documents.id
  ));
--> statement-breakpoint
UPDATE jobs SET finished_at = created_at, lease_until = NULL, lease_token = NULL
WHERE status = 'cancelled' AND finished_at IS NULL;
--> statement-breakpoint
UPDATE reminders SET status = CASE WHEN status = 'processing' THEN 'delivery_unknown' ELSE 'failed' END
WHERE status IN ('pending', 'processing') AND id IN (
  SELECT payload->>'reminderId' FROM jobs WHERE kind = 'reminder.deliver' AND status = 'failed'
);