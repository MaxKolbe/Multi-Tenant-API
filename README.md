# Multi-Tenant-API
A multi-tenant backend where several organizations share a database

## Docker Setup Documentation

This project uses Docker to containerize the Express API and the PostgreSQL database, simplifying both development and production-style deployments.

### Docker Terminology
- **Dockerfile:** A text file with instructions used to build a Docker image.
- **Image:** A read-only blueprint containing the application code, runtime (Node.js), and dependencies.
- **Container:** A running, isolated instance of a Docker image.
- **Docker Compose:** A tool that uses a YAML file (`docker-compose.yml`) to define, configure, and manage multiple containers simultaneously.
- **PostgreSQL container:** A container running the database engine itself.
- **Docker volume:** A persistent storage mechanism managed by Docker that ensures data survives even if the container is removed.

### 1. Docker Architecture
The application is composed of three Docker services defined in `docker-compose.yml`:
- **`multi-tenant-api`**: The main Express API service. It runs the compiled Node.js application.
- **`multi-tenant-db`**: The PostgreSQL database service.
- **`migrate`**: A one-off service used solely to run database migrations using Drizzle.

**Database Connections & Port Mapping:**
- Inside the Docker network, the API container communicates with the database using its service name and internal port: `multi-tenant-db:5432`.
- For host access (e.g., connecting from your machine using a GUI client or running the API locally), the database is mapped to `localhost:5433` on your machine.

### 2. Dockerfile
The project uses a **multi-stage build** in `Dockerfile` to keep the final production image small and secure:
1. **Build Stage (`build`)**: Uses `node:26-alpine3.23`. It installs all dependencies using `npm ci`, copies the source code, and compiles the TypeScript code into JavaScript using `npm run build`.
2. **Production Runtime Stage (`runtime`)**: Also uses `node:26-alpine3.23`. It only copies the compiled `dist` directory, `package.json`, and the `node_modules` from the build stage. It then runs `npm prune --omit=dev` to remove unnecessary development dependencies. Finally, it sets a non-root `node` user and starts the API using `node dist/index.js`.

### 3. PostgreSQL Configuration
The `multi-tenant-db` service runs the `postgres:18-alpine` image.
- **Default Credentials** (from `.env.example`):
  - User: `postgres`
  - Password: `1234`
  - Database: `tenant`
- **Persistence**: Data is saved to a named Docker volume called `multi-tenant-db-data` mounted at `/var/lib/postgresql`. This ensures your database records persist across container restarts and removals.
> **⚠️ WARNING:** Running `docker compose down -v` will delete this volume and permanently erase all your local database data!

### 4. Drizzle Migrations
Migrations are not run automatically when the API starts. This separation of concerns prevents race conditions when running multiple API instances and ensures the database schema is fully updated before any API instance accepts traffic.
- Migrations are run via the dedicated `migrate` container, which executes the `npm run db:migrate` command (triggering `drizzle-kit migrate`).

### 5. Environment Variables
Your `.env` file should configure database connection URLs based on how you run the application.
- **Running entirely inside Docker:** The API uses `PG_DATABASE_DEV_URL=postgresql://postgres:1234@multi-tenant-db:5432/tenant` (as shown in `.env.example`).
- **Running the API on your local machine (Host):** The API must connect via the exposed host port: `PG_DATABASE_DEV_URL=postgresql://postgres:1234@localhost:5433/tenant`.
> **Note:** Never commit real secrets to the repository. Always use `.env.example` as a template for your local `.env` file.

### 6. Development Workflow
During active development, there is no hot-reloading Docker container for the API. Instead, the typical workflow is:
1. Run only the PostgreSQL database via Docker: `docker compose up -d multi-tenant-db`
2. Update your `.env` to connect via the host port: `PG_DATABASE_DEV_URL=postgresql://postgres:1234@localhost:5433/tenant`
3. Run the API directly on your host machine with hot-reloading: `npm run dev`

### 7. Production-Style Docker Workflow
To test the production-style multi-container setup locally, use the following commands:

**Quick Start**
```bash
# 1. Build the images
docker compose build

# 2. Start the PostgreSQL database in the background
docker compose up -d multi-tenant-db

# 3. Wait a few seconds for the database to become healthy, then run migrations
docker compose run --rm migrate

# 4. Start the compiled API service
docker compose up -d multi-tenant-api
```

**Management Commands**
- **Check running containers:** `docker compose ps`
- **View logs:** `docker compose logs -f` (or target a specific service like `docker compose logs -f multi-tenant-api`)
- **Stop services (preserves data):** `docker compose down`
- **Stop services and WIPE DATA:** `docker compose down -v`

---

## 8. Database Security, Roles & Row-Level Security (RLS)

### Database Roles & Privilege Model
- **`postgres` (Privileged Migration Owner)**: Used exclusively during database creation, schema migrations (`drizzle-kit migrate`), setup scripts, and test suite setup.
- **`app_runtime` (Restricted Application Role)**: Used by the Express API application connection pool. Configured as `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS`. Does NOT own tables.

### Tenant Context & Row-Level Security (RLS)
- **RLS Policy Enforcement**: RLS is enabled and forced (`FORCE ROW LEVEL SECURITY`) on `tasks`, `users`, `organizations`, and `references`.
- **Tenant Context (`app.current_org`)**: Tenant context is established transaction-locally using `set_config('app.current_org', tenantId, true)`.
- **Tenant Policy Expression**: Tenant-owned tables (`tasks`, `users`) enforce `org_id = nullif(current_setting('app.current_org', true), '')::uuid`.
- **Missing Tenant Context Behavior**: When `app.current_org` is missing or empty, `nullif` resolves to `NULL`. Since `org_id = NULL` evaluates to `FALSE` (SQL three-valued logic), 0 rows are accessible, and all `INSERT`, `UPDATE`, and `DELETE` operations are rejected.

### Special Table Access Semantics
- **`organizations` Table**: `organizations` allows `SELECT` when `app.current_org` matches OR when `app.current_org` is unset (allowing organization slug lookup during authentication). `INSERT` is permitted for new registration, while `UPDATE` and `DELETE` are restricted strictly to the current tenant ID (`id = app.current_org`).
- **`users` Table & Authentication Flow**: Authentication requests locate the tenant organization slug first. Upon finding the organization ID, `loginUser` executes user retrieval inside a database transaction with `app.current_org` set to the resolved organization ID. This maintains strict `org_id = app.current_org` RLS isolation without needing broad access or `BYPASSRLS`.
- **`references` Table**: Global shared reference lookup table accessible via `SELECT` to `app_runtime`, with `INSERT`, `UPDATE`, and `DELETE` disallowed for `app_runtime`.

### Security Boundary Testing
- Integration test suites (`tests/databaseRole.integration.test.ts` and `tests/rlsPolicies.integration.test.ts`) connect directly as the restricted `app_runtime` database role to verify that cross-tenant access, tenant spoofing (`org_id` tampering), missing context queries, and organization boundary mutations are blocked directly at the PostgreSQL layer.


