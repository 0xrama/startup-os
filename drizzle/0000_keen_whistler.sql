CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`metadata` text,
	`ip_address` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `chat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`llc_id` text,
	`user_id` text NOT NULL,
	`title` text,
	`last_message_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`archived_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`llc_id`) REFERENCES `llcs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`request_id` text,
	`model` text,
	`finish_reason` text,
	`content` text,
	`tool_calls` text,
	`tool_results` text,
	`citations` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `compliance_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`llc_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'upcoming',
	`completed_at` integer,
	`recurring` integer DEFAULT false,
	`recurrence_rule` text,
	`source` text DEFAULT 'system',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`llc_id`) REFERENCES `llcs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`llc_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`file_key` text NOT NULL,
	`file_type` text,
	`file_size` integer,
	`category` text,
	`document_type` text,
	`tax_year` integer,
	`description` text,
	`scan_status` text DEFAULT 'pending',
	`processing_status` text DEFAULT 'pending',
	`processing_error` text,
	`extracted_text_status` text DEFAULT 'pending',
	`extracted_metadata` text,
	`encrypted_metadata` text,
	`file_iv` text,
	`wrapped_file_key` text,
	`encryption_version` integer DEFAULT 1,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`llc_id`) REFERENCES `llcs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knowledge_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_id` text,
	`content` text NOT NULL,
	`embedding` text,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `llc_collaborators` (
	`id` text PRIMARY KEY NOT NULL,
	`llc_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text NOT NULL,
	`accepted_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`llc_id`) REFERENCES `llcs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llcs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`entity_type` text NOT NULL,
	`owner_residency` text DEFAULT 'non_us',
	`formation_date` text,
	`ein` text,
	`ein_status` text DEFAULT 'pending',
	`tax_year_end` text DEFAULT '12-31',
	`tax_classification` text,
	`registered_agent` text,
	`ra_renewal_date` text,
	`annual_report_month` integer,
	`members` text,
	`filing_preferences` text,
	`encrypted_data` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `notice_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`llc_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`issuer` text,
	`notice_type` text,
	`tax_year` integer,
	`response_due_date` text,
	`summary` text,
	`risk_level` text,
	`structured_data` text,
	`draft_task_payload` text,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`llc_id`) REFERENCES `llcs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`sent_at` integer,
	`status` text DEFAULT 'pending',
	`message_id` text,
	`idempotency_key` text,
	`attempt_count` integer DEFAULT 0,
	`last_error` text,
	`processing_started_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`task_id`) REFERENCES `compliance_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`polar_customer_id` text,
	`polar_subscription_id` text,
	`plan` text,
	`status` text DEFAULT 'expired',
	`current_period_start` integer,
	`current_period_end` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_id_unique` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false,
	`image` text,
	`phone` text,
	`phone_verified` integer DEFAULT false,
	`whatsapp_opted_in` integer DEFAULT false,
	`timezone` text DEFAULT 'UTC',
	`onboarding_completed` integer DEFAULT false,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `user_encryption` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pin_wrapped_master_key` text,
	`recovery_wrapped_master_key` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_encryption_user_id_unique` ON `user_encryption` (`user_id`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
