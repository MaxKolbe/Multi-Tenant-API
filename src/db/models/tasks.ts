import * as p from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import { timestamps } from "./timestamps.js";

export const taskStatusEnum = p.pgEnum("task_status", ["pending", "in_progress", "completed"]);

export const tasks = p.pgTable(
  "tasks",
  {
    id: p.uuid("id").primaryKey().defaultRandom().notNull(),
    orgId: p
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: p
      .uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: p.text("title").notNull(),
    description: p.text("description"),
    status: taskStatusEnum("status")
      .default("pending")
      .notNull(),
    ...timestamps,
  },
  (table) => [
    p.index("tasks_org_id_idx").on(table.orgId),
    p.index("tasks_created_by_idx").on(table.createdBy),
  ],
);
