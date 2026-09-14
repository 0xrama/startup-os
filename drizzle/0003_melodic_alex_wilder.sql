ALTER TABLE "llcs" ADD COLUMN "owners_are_individuals" boolean;--> statement-breakpoint
ALTER TABLE "llcs" ADD COLUMN "ownership_is_direct" boolean;--> statement-breakpoint
ALTER TABLE "llcs" ADD COLUMN "owner_count" integer;--> statement-breakpoint
ALTER TABLE "llcs" ADD COLUMN "foreign_owner_count" integer;--> statement-breakpoint
ALTER TABLE "llcs" ADD COLUMN "us_owner_count" integer;