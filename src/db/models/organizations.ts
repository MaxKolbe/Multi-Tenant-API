import * as p from "drizzle-orm/pg-core";
import { timestamps } from "./timestamps.js";

export const organizations = p.pgTable("organizations", {
  id: p.uuid("id").primaryKey().defaultRandom().notNull(),
  name: p.text("name").notNull(),
  slug: p.text("slug").notNull().unique(),
  ...timestamps,
});
