DO $$
DECLARE
  db_name text;
BEGIN
  -- Idempotent creation of restricted runtime role without hardcoded credentials
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE app_runtime WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  -- Dynamically grant CONNECT on the current database
  SELECT current_database() INTO db_name;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_runtime', db_name);
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
