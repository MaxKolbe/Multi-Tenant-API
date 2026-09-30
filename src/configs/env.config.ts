import * as z from "zod";
import { ValidationError } from "../lib/error.js";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  DB_SSL: z.string().default("false"),
  PG_DATABASE_PROD_URL: z.string("PG_DATABASE_PROD_URL is missing"),
  PG_DATABASE_DEV_URL: z.string().default("postgresql://user:password@localhost:5432/database"),
  PG_DATABASE_TEST_URL: z.string("PG_DATABASE_TEST_URL is missing"),
  REDIS_PROD_URL: z.string().optional(),
  REDIS_DEV_URL: z.string().optional(),
  REDIS_TEST_URL: z.string().optional(),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  LOG_LEVEL: z.string().default("http"),
  JWT_SECRET: z.string("JWT_SECRET is missing"),
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

export const env = result.data;
