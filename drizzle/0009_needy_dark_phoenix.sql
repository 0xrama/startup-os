DO $$
BEGIN
  IF (SELECT count(*) FROM "user") > 1 THEN
    RAISE EXCEPTION
      'Pax is single-user, but this database contains multiple accounts. Resolve the accounts manually before applying migration 0009.'
      USING ERRCODE = '23505';
  END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX "single_owner_idx" ON "user" USING btree ((true));