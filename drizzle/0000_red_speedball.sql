CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"ai_base_url" text,
	"ai_api_key" text,
	"ai_model" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"llc_id" text,
	"user_id" text NOT NULL,
	"title" text,
	"last_message_at" timestamp with time zone DEFAULT now(),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"request_id" text,
	"model" text,
	"finish_reason" text,
	"content" text,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"citations" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"llc_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'upcoming',
	"completed_at" timestamp with time zone,
	"recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"source" text DEFAULT 'system',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"llc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"file_key" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"category" text,
	"document_type" text,
	"tax_year" integer,
	"description" text,
	"scan_status" text DEFAULT 'pending',
	"processing_status" text DEFAULT 'pending',
	"processing_error" text,
	"extracted_text_status" text DEFAULT 'pending',
	"extracted_metadata" jsonb,
	"encrypted_metadata" jsonb,
	"file_iv" text,
	"wrapped_file_key" jsonb,
	"encryption_version" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "llcs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"entity_type" text NOT NULL,
	"owner_residency" text DEFAULT 'non_us',
	"formation_date" text,
	"ein" text,
	"ein_status" text DEFAULT 'pending',
	"tax_year_end" text DEFAULT '12-31',
	"tax_classification" text,
	"registered_agent" text,
	"ra_renewal_date" text,
	"annual_report_month" integer,
	"members" jsonb,
	"filing_preferences" jsonb,
	"encrypted_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notice_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"llc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"issuer" text,
	"notice_type" text,
	"tax_year" integer,
	"response_due_date" text,
	"summary" text,
	"risk_level" text,
	"structured_data" jsonb,
	"draft_task_payload" jsonb,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'pending',
	"message_id" text,
	"idempotency_key" text,
	"attempt_count" integer DEFAULT 0,
	"last_error" text,
	"processing_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"image" text,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"whatsapp_opted_in" boolean DEFAULT false,
	"timezone" text DEFAULT 'UTC',
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_encryption" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pin_wrapped_master_key" jsonb,
	"recovery_wrapped_master_key" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_encryption_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_cases" ADD CONSTRAINT "notice_cases_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_cases" ADD CONSTRAINT "notice_cases_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_compliance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."compliance_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;