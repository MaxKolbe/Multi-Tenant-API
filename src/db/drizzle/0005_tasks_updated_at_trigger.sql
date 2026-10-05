CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS set_tasks_updated_at ON "tasks";
--> statement-breakpoint
CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON "tasks"
FOR EACH ROW
EXECUTE FUNCTION update_tasks_updated_at();
