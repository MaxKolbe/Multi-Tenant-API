import db from "../db/db.js";
import { sql } from "drizzle-orm";

/**
 * Executes database operations within a transaction with PostgreSQL tenant context set.
 * Sets session configuration `app.current_org` for the duration of the transaction.
 */
export async function withTenantContext<T>(
  orgId: string | undefined | null,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    if (orgId) {
      await tx.execute(sql`SELECT set_config('app.current_org', ${orgId}, true);`);
    } else {
      await tx.execute(sql`SELECT set_config('app.current_org', '', true);`);
    }
    return callback(tx);
  });
}
