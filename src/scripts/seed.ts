import { env } from "../configs/env.config.js";
import logger from "../configs/logger.config.js";
import db from "../db/db.js";
import { organizations, users, tasks } from "../db/models/index.js";
import bcrypt from "bcrypt";

// Guard: Ensure seeding only happens in development/test environments
if (env.NODE_ENV === "production") {
  logger.error("Seeding is disabled in production environments.");
  process.exit(1);
}

// Development-only seed data with static UUIDs for idempotency
const SEED_ORGS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Acme Corp",
    slug: "acme-corp",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Globex Inc",
    slug: "globex-inc",
  },
];

// Fictional development hashes
const DEV_PASSWORD_HASH = bcrypt.hashSync("password123", 10);

const SEED_USERS = [
  {
    id: "33333333-3333-3333-3333-333333333331",
    orgId: SEED_ORGS[0]!.id,
    email: "alice@acme.corp",
    passwordHash: DEV_PASSWORD_HASH,
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    orgId: SEED_ORGS[1]!.id,
    email: "bob@globex.inc",
    passwordHash: DEV_PASSWORD_HASH,
  },
];

const SEED_TASKS = [
  {
    id: "44444444-4444-4444-4444-444444444441",
    orgId: SEED_ORGS[0]!.id,
    createdBy: SEED_USERS[0]!.id,
    title: "Setup Acme infrastructure",
    description: "Provision servers and configure network.",
    status: "in_progress" as const,
  },
  {
    id: "44444444-4444-4444-4444-444444444442",
    orgId: SEED_ORGS[1]!.id,
    createdBy: SEED_USERS[1]!.id,
    title: "Q3 Planning",
    description: "Determine OKRs for Q3.",
    status: "pending" as const,
  },
];

async function seed() {
  logger.info("Starting development seed...");
  logger.info("NOTE: This data is fictional and safe to rerun.");

  try {
    await db.transaction(async (tx) => {
      // Seed Organizations
      logger.info("Seeding organizations...");
      for (const org of SEED_ORGS) {
        await tx.insert(organizations).values(org).onConflictDoNothing({ target: organizations.id });
      }

      // Seed Users
      logger.info("Seeding users...");
      for (const user of SEED_USERS) {
        await tx.insert(users).values(user).onConflictDoNothing({ target: users.id });
      }

      // Seed Tasks
      logger.info("Seeding tasks...");
      for (const task of SEED_TASKS) {
        await tx.insert(tasks).values(task).onConflictDoNothing({ target: tasks.id });
      }
    });

    logger.info("Seeding completed successfully.");
    process.exit(0);
  } catch (error: any) {
    logger.error("Seeding failed", { message: error.message, error });
    process.exit(1);
  }
}

seed();