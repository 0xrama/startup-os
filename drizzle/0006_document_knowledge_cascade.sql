ALTER TABLE "knowledge_chunks" ADD COLUMN "document_id" text;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
UPDATE "knowledge_chunks" AS chunks SET "document_id" = docs.id
FROM "documents" AS docs
WHERE chunks.metadata->>'kind' = 'user_document'
  AND chunks.metadata->>'documentId' = docs.id;