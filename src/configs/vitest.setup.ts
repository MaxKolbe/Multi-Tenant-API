import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(import.meta.dirname, "../../.env");

// Only load .env file if it exists (it won't exist in CI — 
// GitHub Actions injects env vars directly via the `env:` block)
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
