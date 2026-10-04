
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../configs/env.config.js";
import { Pool, PoolClient } from "pg";
import logger from "../configs/logger.config.js";

const dburl = env.APP_DB_URL;

const pool = new Pool({
  connectionString: dburl,
  ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export async function connectDatabase() {
  try {
    const client = await pool.connect();
    client.release();
    logger.info("Connected to database Pool successfully");
  } catch (err) {
    logger.error("Failed to connect to database:", err);
    process.exit(1);
  }
}

pool.on("error", (err: Error, client: PoolClient) => {
  logger.error("Unexpected error on idle client", {
    err,
  });
});

const db = drizzle({ client: pool });
export default db;
