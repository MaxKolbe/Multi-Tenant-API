-- Enable and Force RLS on all relevant tables
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- TASKS POLICIES
CREATE POLICY tasks_select_policy ON "tasks"
  FOR SELECT
  TO app_runtime
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY tasks_insert_policy ON "tasks"
  FOR INSERT
  TO app_runtime
  WITH CHECK (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY tasks_update_policy ON "tasks"
  FOR UPDATE
  TO app_runtime
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY tasks_delete_policy ON "tasks"
  FOR DELETE
  TO app_runtime
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
-- USERS POLICIES
CREATE POLICY users_select_policy ON "users"
  FOR SELECT
  TO app_runtime
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY users_insert_policy ON "users"
  FOR INSERT
  TO app_runtime
  WITH CHECK (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY users_update_policy ON "users"
  FOR UPDATE
  TO app_runtime
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY users_delete_policy ON "users"
  FOR DELETE
  TO app_runtime
  USING (org_id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
-- ORGANIZATIONS POLICIES
CREATE POLICY organizations_select_policy ON "organizations"
  FOR SELECT
  TO app_runtime
  USING (
    id = nullif(current_setting('app.current_org', true), '')::uuid
    OR nullif(current_setting('app.current_org', true), '') IS NULL
  );

--> statement-breakpoint
CREATE POLICY organizations_insert_policy ON "organizations"
  FOR INSERT
  TO app_runtime
  WITH CHECK (true);

--> statement-breakpoint
CREATE POLICY organizations_update_policy ON "organizations"
  FOR UPDATE
  TO app_runtime
  USING (id = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.current_org', true), '')::uuid);

--> statement-breakpoint
CREATE POLICY organizations_delete_policy ON "organizations"
  FOR DELETE
  TO app_runtime
  USING (id = nullif(current_setting('app.current_org', true), '')::uuid);

