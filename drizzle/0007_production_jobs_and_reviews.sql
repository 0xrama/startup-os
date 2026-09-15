CREATE TABLE "filing_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"llc_id" text NOT NULL,
	"tax_year" integer NOT NULL,
	"rule_version" text NOT NULL,
	"encrypted_snapshot" text NOT NULL,
	"review_status" text DEFAULT 'unreviewed' NOT NULL,
	"review_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "jobs_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "operation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"request_id" text,
	"model" text,
	"prompt_version" text,
	"source_revisions" jsonb,
	"duration_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related_party_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"llc_id" text NOT NULL,
	"tax_year" integer NOT NULL,
	"encrypted_data" text NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_heartbeats" (
	"id" text PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "reminders_idempotency_idx";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "analysis_consent_version" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "analysis_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "analysis_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "analysis_job_id" text;--> statement-breakpoint
ALTER TABLE "filing_assessments" ADD CONSTRAINT "filing_assessments_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_party_transactions" ADD CONSTRAINT "related_party_transactions_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_llc_year_idx" ON "filing_assessments" USING btree ("llc_id","tax_year");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "jobs_user_idx" ON "jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "operation_events_kind_created_idx" ON "operation_events" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "transactions_llc_year_idx" ON "related_party_transactions" USING btree ("llc_id","tax_year");--> statement-breakpoint
-- Preserve the oldest successful delivery, or the oldest row if none succeeded.
-- Keep duplicate history without permitting duplicate pending delivery.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY idempotency_key ORDER BY (status = 'sent') DESC NULLS LAST, created_at, id
  ) AS ordinal FROM reminders WHERE idempotency_key IS NOT NULL
)
UPDATE reminders SET idempotency_key = NULL,
  status = CASE WHEN status = 'sent' THEN status ELSE 'cancelled' END
WHERE id IN (SELECT id FROM ranked WHERE ordinal > 1);
--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_idempotency_idx" ON "reminders" USING btree ("idempotency_key");