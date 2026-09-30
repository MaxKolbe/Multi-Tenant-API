import * as p from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { timestamps } from "./timestamps.js";

export const users = p.pgTable(
  "users",
  {
    id: p.uuid("id").primaryKey().defaultRandom().notNull(),
    orgId: p
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: p.text("email").notNull(),
    passwordHash: p.text("password_hash").notNull(),
    ...timestamps,
  },
  (table) => [
    p.unique("users_org_id_email_unique").on(table.orgId, table.email),
    p.index("users_org_id_idx").on(table.orgId),
  ],
);
