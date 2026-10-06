CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "table_name" text NOT NULL,
  "record_id" uuid NOT NULL,
  "action" text NOT NULL,
  "org_id" uuid,
  "actor_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_org_id_created_at_idx" ON "audit_logs" USING btree ("org_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_table_record_idx" ON "audit_logs" USING btree ("table_name", "record_id");
--> statement-breakpoint
GRANT SELECT, INSERT ON "audit_logs" TO app_runtime;
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_logs_select_policy ON "audit_logs"
  FOR SELECT
  TO app_runtime
  USING (
    org_id = nullif(current_setting('app.current_org', true), '')::uuid
  );
--> statement-breakpoint
CREATE POLICY audit_logs_insert_policy ON "audit_logs"
  FOR INSERT
  TO app_runtime
  WITH CHECK (
    org_id = nullif(current_setting('app.current_org', true), '')::uuid
    OR org_id IS NULL
  );
