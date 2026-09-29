import { defineConfig } from "drizzle-kit";

const dbMap = new Map([
  ["development", process.env.PG_DATABASE_DEV_URL!.toString()],
  ["test", process.env.PG_DATABASE_TEST_URL!.toString()],
  ["production", process.env.PG_DATABASE_PROD_URL!.toString()]
])
const dburl = dbMap.get(process.env.NODE_ENV!)

export default defineConfig({   
  out: "./src/db/drizzle",
  dialect: "postgresql",
  schema: "./src/db/models",  
  dbCredentials: {
    url: `${dburl}`
    // used ?sslmode=verify-full to avoid adding the ssl property
  },
});