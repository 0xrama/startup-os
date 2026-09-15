CREATE INDEX "chat_conversations_user_llc_idx" ON "chat_conversations" USING btree ("user_id","llc_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_created_idx" ON "chat_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "compliance_tasks_llc_due_idx" ON "compliance_tasks" USING btree ("llc_id","due_date");--> statement-breakpoint
CREATE INDEX "documents_llc_created_idx" ON "documents" USING btree ("llc_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_search_idx" ON "knowledge_chunks" USING gin (to_tsvector('english', "content"));--> statement-breakpoint
CREATE INDEX "knowledge_chunks_source_id_idx" ON "knowledge_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_llc_id_idx" ON "knowledge_chunks" USING btree (("metadata"->>'llcId'));--> statement-breakpoint
CREATE INDEX "llcs_user_id_idx" ON "llcs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notice_cases_llc_id_idx" ON "notice_cases" USING btree ("llc_id");--> statement-breakpoint
CREATE INDEX "notice_cases_document_id_idx" ON "notice_cases" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "reminders_status_scheduled_idx" ON "reminders" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "reminders_idempotency_idx" ON "reminders" USING btree ("idempotency_key");