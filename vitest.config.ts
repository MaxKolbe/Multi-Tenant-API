import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: import.meta.dirname,
  test: {
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 10000,
    globals: true,
    environment: "node",
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/configs/**"],
    },
  },
});
