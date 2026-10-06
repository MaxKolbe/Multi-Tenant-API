import db from "../db/db.js";
import { sql } from "drizzle-orm";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Security Documentation:
 * - `app.current_org` and `app.current_user` are application-provided PostgreSQL transaction-local settings (`is_local = true`).
 * - PostgreSQL does not independently cryptographically verify JWT tokens; the security boundary relies on:
 *   1. Express authentication middleware verifying JWT signatures before populating `req.user`.
 *   2. Restricted `app_runtime` database role subject to PostgreSQL Row-Level Security (RLS).
 *   3. Transaction-local configuration via `set_config(..., true)` preventing settings from leaking between connection pool connections.
 * - Clients cannot directly choose or spoof `app.current_org` or `app.current_user`.
 *
 * Executes database operations within a transaction with PostgreSQL tenant (`app.current_org`)
 * and actor (`app.current_user`) context set transaction-locally.
 */
export async function withTenantContext<T>(
  orgId: string | undefined | null,
  callback: (tx: DbTransaction) => Promise<T>,
  existingTx?: DbTransaction,
  actorId?: string | undefined | null
): Promise<T> {
  const tenantVal = orgId ?? "";
  const actorVal = actorId ?? "";

  if (existingTx) {
    await existingTx.execute(sql`SELECT set_config('app.current_org', ${tenantVal}, true);`);
    await existingTx.execute(sql`SELECT set_config('app.current_user', ${actorVal}, true);`);
    return callback(existingTx);
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_org', ${tenantVal}, true);`);
    await tx.execute(sql`SELECT set_config('app.current_user', ${actorVal}, true);`);
    return callback(tx);
  });
}


