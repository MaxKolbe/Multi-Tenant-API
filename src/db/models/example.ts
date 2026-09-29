import * as p from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

// TIMESTAMPS
const timestamps = {
  updatedAt: p.timestamp("updated_at"),
  createdAt: p.timestamp("created_at").defaultNow().notNull(),
  deletedAt: p.timestamp("deleted_at"),
};

export const referenceTable = p.pgTable(
  "references",
  {
    id: p
      .uuid()
      .primaryKey()
      .default(sql`uuid_generate_v4()`)
      .notNull(),
    int: p.integer(),
    int1: p.integer().default(10),
    int2: p.integer().notNull(),
    boolean: p.boolean(),
    text1: p.text().notNull(),
    text2: p.text(),
    varchar1: p.varchar(),
    varchar2: p.varchar({ length: 256 }),
    char1: p.char(),
    char2: p.char({ length: 256 }),
    numeric1: p.numeric({ mode: "number" }),
    numeric2: p.numeric({ precision: 100 }),
    numeric3: p.numeric({ precision: 100, scale: 20 }),
    json1: p.json(),
    json2: p.json().default({ foo: "bar" }),
    jsonb1: p.jsonb(),
    jsonb2: p.jsonb().default({ foo: "bar" }),
    uuid1: p.uuid(), // "uuid1" uuid
    uuid2: p.uuid().defaultRandom(), // "uuid2" uuid default gen_random_uuid()
    time1: p.time(),
    date: p.date(),
    numberArray: p.numeric({ mode: "number" }).array(),
    stringArray1: p.text().array(),
    unique: p.text().unique(),
    stringArray2: p.text().array().notNull(),
    timestamp1: p.timestamp(),
    ...timestamps,
  },
  (table) => [
    index("example_idx").on(table.text2),
    index("example_search_index").using(
      "gin",
      sql`(
        setweight(to_tsvector('english', ${table.text1}), 'A') ||
        setweight(to_tsvector('english', coalesce(${table.text2}, '')), 'B') ||
        setweight(array_to_tsvector(coalesce(${table.stringArray1}, ARRAY[]::text[])), 'C') ||
        setweight(to_tsvector('english', coalesce(${table.numeric1}::text, '')), 'D') 
      )`,
    ),
  ],
);
