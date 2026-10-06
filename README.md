# Multi-Tenant-API

A production-style multi-tenant backend built with Node.js, Express, TypeScript, Drizzle ORM, and PostgreSQL. Multiple organizations share a single database with strict tenant isolation enforced at the PostgreSQL layer via Row-Level Security (RLS), transaction-scoped context, and database audit triggers.

---

## 1. Prerequisites

Before running the application locally or via Docker, ensure you have installed:
- **Docker & Docker Compose** (Docker Desktop or Docker Engine 24+)
- **Node.js 26+ & npm** (optional, for running/testing on host machine)

### Environment Setup
Create your local `.env` file from the provided template:
```bash
cp .env.example .env
```

### Environment Variables Overview
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` |
| `PORT` | API HTTP port | `3000` |
| `PG_MIGRATION_DEV_URL` | Privileged connection string for running migrations | `postgresql://postgres:1234@localhost:5433/tenant` |
| `PG_APP_DEV_URL` | Restricted application connection string for Express API | `postgresql://app_runtime:app_password@localhost:5433/tenant` |
| `DB_SSL` | Enable SSL for PostgreSQL connections | `false` |
| `JWT_SECRET` | Secret key for JWT signing and verification | `qwerty` |

> **⚠️ Security Note:** Never commit `.env` files or secret credentials to version control. Always maintain `.env.example` as the template for required configuration.

---

## 2. Docker Architecture & Workflow

The application is containerized into three services defined in `docker-compose.yml`:
1. **`multi-tenant-db`**: PostgreSQL 18 container running the database engine. Internal port `5432` mapped to host port `5433`.
2. **`migrate`**: One-off migration container (`npm run db:migrate`) that waits for `multi-tenant-db` to become healthy before executing Drizzle schema migrations.
3. **`multi-tenant-api`**: Express API service running the compiled Node.js application. Listens on container port `3000` mapped to host port `3000`. Starts only after `migrate` completes successfully.

### Production-Style Docker Quick Start
```bash
# 1. Build Docker images
docker compose build

# 2. Start PostgreSQL database in background
docker compose up -d multi-tenant-db

# 3. Execute database migrations (waits for database healthcheck)
docker compose run --rm migrate

# 4. Start compiled Express API
docker compose up -d multi-tenant-api
```

### Managing the Stack
- **Check service status**: `docker compose ps`
- **View container logs**: `docker compose logs -f` (or `docker compose logs -f multi-tenant-api`)
- **Stop services (preserves data volume)**: `docker compose down`

---

## 3. Resetting Local Data

Local database data is persisted in a named Docker volume called `multi-tenant-db-data`.

To completely wipe and reset the local database state:
```bash
docker compose down -v
```

> **⚠️ WARNING:** `docker compose down -v` permanently deletes the `multi-tenant-db-data` volume and destroys all local database records!

---

## 4. Row-Level Security (RLS) & Security Architecture

### Database Role Separation
- **`postgres` (Privileged Migration Owner)**: Used exclusively during schema migrations (`drizzle-kit migrate`), role setup, and test suite initialization.
- **`app_runtime` (Restricted Application Role)**: Used by Express API connection pools. Configured with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`. Does not own schema tables.

### Tenant Isolation Model
- **RLS Policy Enforcement**: RLS is enabled and forced (`FORCE ROW LEVEL SECURITY`) on `tasks`, `users`, `organizations`, and `audit_logs`.
- **Transaction-Local Tenant Context (`app.current_org`)**: Established transaction-locally using `SELECT set_config('app.current_org', tenantId, true)` inside `withTenantContext(...)`.
- **Policy Expression**: Tenant tables enforce `org_id = nullif(current_setting('app.current_org', true), '')::uuid`.
- **Unset Context Protection**: When `app.current_org` is empty or missing, `nullif` resolves to `NULL`. Since `org_id = NULL` evaluates to `FALSE`, zero rows are returned and all mutation attempts are rejected.

---

## 5. Database Trigger Architecture

### 1. Automatic `updated_at` Trigger (Step 21)
- **Behavior**: PostgreSQL automatically updates `tasks.updated_at` to `NOW()` on every row `UPDATE` via trigger `set_tasks_updated_at` executing `update_tasks_updated_at()`.
- **Ownership**: Timestamp management is fully owned by PostgreSQL.

### 2. Task Audit Trigger (Steps 22–24)
- **Behavior**: PostgreSQL automatically logs task mutations (`INSERT`, `UPDATE`, `DELETE`) into `audit_logs` via `AFTER INSERT OR UPDATE OR DELETE` trigger `tasks_audit_trigger` executing `audit_tasks_trigger()`.
- **Actor Context Propagation (`app.current_user`)**:
  - Express authentication middleware verifies incoming Bearer JWT tokens and sets `req.user.id`.
  - Controllers pass the verified user ID to `withTenantContext(...)`, which executes `SELECT set_config('app.current_user', userId, true)` transaction-locally.
  - The trigger extracts `app.current_user` to populate `actor_id` (storing `NULL` for unauthenticated/system operations).
- **Snapshot Contents**:
  - `INSERT`: `old_data = NULL`, `new_data = to_jsonb(NEW)`
  - `UPDATE`: `old_data = to_jsonb(OLD)`, `new_data = to_jsonb(NEW)` (reflects `updated_at` trigger updates)
  - `DELETE`: `old_data = to_jsonb(OLD)`, `new_data = NULL`
- **Transactional Participation**: Audit log entries are written within the same PostgreSQL transaction as the task mutation. If a transaction rolls back, both the task mutation and its audit entry are atomicity-rolled back.

---

## 6. Known Limitations & Architectural Lessons

1. **Transaction-Local Session Context**: PostgreSQL settings `app.current_org` and `app.current_user` are application-provided transaction-local settings (`is_local = true`). PostgreSQL does not independently verify JWT signatures; the security boundary relies on Express authentication middleware verifying JWT signatures before populating `req.user`.
2. **Audit Log Immutability**: `audit_logs` permissions granted to `app_runtime` allow `SELECT` and `INSERT` only. No `UPDATE` or `DELETE` RLS policies exist for `app_runtime`, ensuring application tenants cannot modify or purge historical audit records.
3. **Decoupled Audit Foreign Keys**: `audit_logs` intentionally omits foreign key constraints on `org_id`, `actor_id`, and `record_id`. Audit records serve as persistent historical ledgers that survive entity deletions without triggering `ON DELETE CASCADE` history purges or `ON DELETE RESTRICT` blockages.

---

## 7. Testing & Verification

Run the full integration test suite covering tenant boundaries, JWT auth, database role restrictions, RLS policies, `updated_at` triggers, and audit logging:
```bash
npm test
```
To verify TypeScript compilation:
```bash
npm run build
```
