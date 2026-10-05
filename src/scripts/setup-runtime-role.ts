import pg from "pg";
import { env } from "../configs/env.config.js";
import logger from "../configs/logger.config.js";

const { Client } = pg;

export async function setupRuntimeRolePassword() {
  const migrationUrl = env.MIGRATION_DB_URL;
  const appUrl = env.APP_DB_URL;

  if (!migrationUrl || !appUrl) {
    logger.error("Missing migration or app database URL for role configuration.");
    process.exit(1);
  }

  let appPassword = process.env.PG_APP_PASSWORD;

  if (!appPassword) {
    try {
      const parsedUrl = new URL(appUrl);
      appPassword = decodeURIComponent(parsedUrl.password);
    } catch {
      // Ignore URL parsing errors if appUrl is invalid URL
    }
  }

  if (!appPassword) {
    logger.warn("No PG_APP_PASSWORD or password in PG_APP_*_URL provided; skipping password assignment.");
    return;
  }

  const client = new Client({
    connectionString: migrationUrl,
    ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    // Escape single quotes in password for DCL literal statement
    const escapedPassword = appPassword.replace(/'/g, "''");
    await client.query(`ALTER ROLE app_runtime WITH PASSWORD '${escapedPassword}';`);
    logger.info("Successfully configured app_runtime password from environment.");
  } catch (error: any) {
    logger.error("Failed to set app_runtime role password:", { message: error.message });
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupRuntimeRolePassword();
