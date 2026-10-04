import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const nodeEnv = process.env.NODE_ENV || "development";

let dburl = process.env.PG_MIGRATION_DEV_URL || process.env.PG_DATABASE_DEV_URL;
if (nodeEnv === "test") {
  dburl = process.env.PG_MIGRATION_TEST_URL || process.env.PG_DATABASE_TEST_URL;
} else if (nodeEnv === "production") {
  dburl = process.env.PG_MIGRATION_PROD_URL || process.env.PG_DATABASE_PROD_URL;
}

if (!dburl) {
  dburl = "postgresql://postgres:1234@localhost:5433/tenant";
}

export default defineConfig({   
  out: "./src/db/drizzle",
  dialect: "postgresql",
  schema: "./src/db/models",  
  dbCredentials: {
    url: `${dburl}`
    // used ?sslmode=verify-full to avoid adding the ssl property
  },
});