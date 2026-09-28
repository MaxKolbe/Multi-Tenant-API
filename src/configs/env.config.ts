import * as z from "zod";
import { ValidationError } from "../lib/error.js";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
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
  JWT_SECRET: z.string().default("thequickbrownfoxjumpedoverthelog"),
  JWT_ACCESS_SECRET: z.string().default("thequickbrownfoxjumpedoverthelog"),
  JWT_REFRESH_SECRET: z.string().default("thequickbrownfoxjumpedoverthelog"),
  BREVO_API_KEY: z.string("BREVO_API_KEY is missing"),
  BREVO_EMAIL: z.string("BREVO_EMAIL is missing"),
  STRIPE_SECRET_KEY: z.string("STRIPE_SECRET_KEY is missing"),
  STRIPE_WEBHOOK_SECRET: z.string("STRIPE_WEBHOOK_SECRET is missing"),
  API_BASE_URL: z.string().default("http://localhost:3000"),
  CLOUDINARY_NAME: z.string().optional(),
  CLOUDINARY_KEY: z.string().optional(),
  CLOUDINARY_SECRET: z.string().optional(),
  EXAMPLE_BASE_URL: z.string().optional(),
  EXAMPLE_API_KEY: z.string().optional(),
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
