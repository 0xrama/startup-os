CREATE TABLE "document_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"llc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"package_type" text NOT NULL,
	"tax_year" integer NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"content_format" text DEFAULT 'text/markdown' NOT NULL,
	"content" text NOT NULL,
	"checksum" text NOT NULL,
	"byte_size" integer NOT NULL,
	"marked_filed_at" timestamp with time zone,
	"filed_method" text,
	"filed_reference" text,
	"proof_document_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notice_cases" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_packages" ADD CONSTRAINT "document_packages_llc_id_llcs_id_fk" FOREIGN KEY ("llc_id") REFERENCES "public"."llcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_packages" ADD CONSTRAINT "document_packages_proof_document_id_documents_id_fk" FOREIGN KEY ("proof_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_packages_llc_id_idx" ON "document_packages" USING btree ("llc_id");--> statement-breakpoint
CREATE INDEX "document_packages_llc_year_idx" ON "document_packages" USING btree ("llc_id","package_type","tax_year");