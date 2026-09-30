import logger from "../../src/configs/logger.config.js";
import { testDb } from "./testDb.js";
import { sql } from "drizzle-orm";

// CLEAR TABLES
export const clearTables = async () => {
  try {
    logger.info("Clearing tables...");
    await testDb.execute(sql`TRUNCATE TABLE organizations, users, tasks CASCADE;`);
    logger.info("Tables cleared :)");
  } catch (error: any) {
    logger.error("Could not delete all tables", {
      message: error.message,
    });
  }
};

// INSTALL EXTENSIONS
export const installExtensions = async () => {
  try {
    logger.info("Installing Extensions");
    await testDb.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    logger.info("Extensions Installed :)");
  } catch (error: any) {
    logger.error("Could not install extensions", {
      message: error.message,
    });
  }
};
