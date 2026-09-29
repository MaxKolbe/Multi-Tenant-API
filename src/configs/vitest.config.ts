import path from "node:path";
import { defineConfig } from "vitest/config";

const configDir = import.meta.dirname;
const rootDir = path.resolve(configDir, "../..");

export default defineConfig({
  envDir: rootDir,
  test: {
    setupFiles: [path.resolve(configDir, "vitest.setup.ts")],
    testTimeout: 10000,
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/configs/**"],
    },
  },
});
