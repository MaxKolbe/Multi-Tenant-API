CREATE OR REPLACE FUNCTION audit_tasks_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_task_id uuid;
  v_org_id uuid;
  v_actor_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  v_actor_id := nullif(current_setting('app.current_user', true), '')::uuid;

  IF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    v_task_id := NEW.id;
    v_org_id := NEW.org_id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_task_id := NEW.id;
    v_org_id := NEW.org_id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_task_id := OLD.id;
    v_org_id := OLD.org_id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  INSERT INTO "audit_logs" (
    table_name,
    record_id,
    action,
    org_id,
    actor_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    'tasks',
    v_task_id,
    v_action,
    v_org_id,
    v_actor_id,
    v_old_data,
    v_new_data,
    NOW()
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tasks_audit_trigger ON "tasks";
--> statement-breakpoint
CREATE TRIGGER tasks_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "tasks"
FOR EACH ROW
EXECUTE FUNCTION audit_tasks_trigger();
