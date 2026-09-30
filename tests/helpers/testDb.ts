import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../../src/configs/env.config.js";
import { Pool } from "pg";

const testDbUrl = env.PG_DATABASE_TEST_URL;

if (!testDbUrl) {
  throw new Error("Test database URL is not configured. Tests cannot run.");
}

// if (env.NODE_ENV !== "test") {
//   throw new Error("Test database helper must only be used in 'test' environment.");
// }

export const testPool = new Pool({
  connectionString: testDbUrl,
  ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export const testDb = drizzle({ client: testPool });

export const closeTestDb = async () => {
  await testPool.end();
};
