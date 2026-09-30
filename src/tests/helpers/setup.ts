import { organizations, users, tasks } from "../../db/models/index.js";
import logger from "../../configs/logger.config.js";
import db from "../../db/db.js";

// CLEAR TABLES
export const clearTables = async () => {
  try {
    logger.info("Clearing tables...");
    await db.delete(tasks);
    await db.delete(users);
    await db.delete(organizations);
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
    await db.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    logger.info("Extensions Installed :)");
  } catch (error: any) {
    logger.error("Could not install extensions", {
      message: error.message,
    });
  }
};
