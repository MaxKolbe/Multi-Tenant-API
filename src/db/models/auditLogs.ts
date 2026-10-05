import * as p from "drizzle-orm/pg-core";

export const auditLogs = p.pgTable(
  "audit_logs",
  {
    id: p.uuid("id").primaryKey().defaultRandom().notNull(),
    tableName: p.text("table_name").notNull(),
    recordId: p.uuid("record_id").notNull(),
    action: p.text("action").notNull(),
    orgId: p.uuid("org_id"),
    actorId: p.uuid("actor_id"),
    oldData: p.jsonb("old_data"),
    newData: p.jsonb("new_data"),
    createdAt: p.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    p.index("audit_logs_org_id_created_at_idx").on(table.orgId, table.createdAt.desc()),
    p.index("audit_logs_table_record_idx").on(table.tableName, table.recordId),
  ],
);
