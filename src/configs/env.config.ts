import fs from "node:fs";
import path from "node:path";
import * as z from "zod";
import { ValidationError } from "../lib/error.js";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  DB_SSL: z.string().default("false"),
  PG_DATABASE_PROD_URL: z.string().optional(),
  PG_DATABASE_DEV_URL: z.string().optional(),
  PG_DATABASE_TEST_URL: z.string().optional(),
  PG_MIGRATION_PROD_URL: z.string().optional(),
  PG_MIGRATION_DEV_URL: z.string().optional(),
  PG_MIGRATION_TEST_URL: z.string().optional(),
  PG_APP_PROD_URL: z.string().optional(),
  PG_APP_DEV_URL: z.string().optional(),
  PG_APP_TEST_URL: z.string().optional(),
  PG_APP_PASSWORD: z.string().optional(),
  REDIS_PROD_URL: z.string().optional(),
  REDIS_DEV_URL: z.string().optional(),
  REDIS_TEST_URL: z.string().optional(),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  LOG_LEVEL: z.string().default("http"),
  JWT_SECRET: z.string().default("qwerty"),
  API_BASE_URL: z.string().default("http://localhost:3000"),
});

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  const errors = result.error.issues.map((issue: any) => ({
    field: issue.path,
    message: issue.message,
  }));

  throw new ValidationError("Invalid environment configuration", errors);
}

const rawEnv = result.data;

function resolveMigrationUrl(nodeEnv: string): string {
  if (nodeEnv === "production") {
    return rawEnv.PG_MIGRATION_PROD_URL || rawEnv.PG_DATABASE_PROD_URL || "postgresql://postgres:1234@multi-tenant-db:5432/tenant";
  }
  if (nodeEnv === "test") {
    return rawEnv.PG_MIGRATION_TEST_URL || rawEnv.PG_DATABASE_TEST_URL || "postgresql://postgres:1234@localhost:5433/tenant";
  }
  return rawEnv.PG_MIGRATION_DEV_URL || rawEnv.PG_DATABASE_DEV_URL || "postgresql://postgres:1234@localhost:5433/tenant";
}

function resolveAppUrl(nodeEnv: string): string {
  if (nodeEnv === "production") {
    if (rawEnv.PG_APP_PROD_URL) return rawEnv.PG_APP_PROD_URL;
    if (rawEnv.PG_DATABASE_PROD_URL) return deriveAppUrlFromBase(rawEnv.PG_DATABASE_PROD_URL, rawEnv.PG_APP_PASSWORD);
    return "postgresql://app_runtime@multi-tenant-db:5432/tenant";
  }
  if (nodeEnv === "test") {
    if (rawEnv.PG_APP_TEST_URL) return rawEnv.PG_APP_TEST_URL;
    if (rawEnv.PG_DATABASE_TEST_URL) return deriveAppUrlFromBase(rawEnv.PG_DATABASE_TEST_URL, rawEnv.PG_APP_PASSWORD);
    return "postgresql://app_runtime@localhost:5433/tenant";
  }
  if (rawEnv.PG_APP_DEV_URL) return rawEnv.PG_APP_DEV_URL;
  if (rawEnv.PG_DATABASE_DEV_URL) return deriveAppUrlFromBase(rawEnv.PG_DATABASE_DEV_URL, rawEnv.PG_APP_PASSWORD);
  return "postgresql://app_runtime@localhost:5433/tenant";
}

function deriveAppUrlFromBase(baseUrl: string, customPassword?: string): string {
  try {
    const url = new URL(baseUrl);
    url.username = "app_runtime";
    if (customPassword) {
      url.password = customPassword;
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export const env = {
  ...rawEnv,
  MIGRATION_DB_URL: resolveMigrationUrl(rawEnv.NODE_ENV),
  APP_DB_URL: resolveAppUrl(rawEnv.NODE_ENV),
};
