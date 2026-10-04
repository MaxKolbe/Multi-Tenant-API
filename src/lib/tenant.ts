import db from "../db/db.js";
import { sql } from "drizzle-orm";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Executes database operations within a transaction with PostgreSQL tenant context set.
 * Sets session configuration `app.current_org` transaction-locally (`is_local = true`).
 *
 * If an existing transaction `existingTx` is provided, the tenant context is set on it
 * and the callback is executed within that transaction. Otherwise, a new transaction
 * is acquired from the database pool.
 */
export async function withTenantContext<T>(
  orgId: string | undefined | null,
  callback: (tx: DbTransaction) => Promise<T>,
  existingTx?: DbTransaction
): Promise<T> {
  const tenantVal = orgId ?? "";

  if (existingTx) {
    await existingTx.execute(sql`SELECT set_config('app.current_org', ${tenantVal}, true);`);
    return callback(existingTx);
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_org', ${tenantVal}, true);`);
    return callback(tx);
  });
}

