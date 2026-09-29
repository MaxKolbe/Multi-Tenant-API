import * as p from "drizzle-orm/pg-core";

export const timestamps = {
  updatedAt: p.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: p
    .timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: p.timestamp("deleted_at", { withTimezone: true }),
};
