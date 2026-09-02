import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 45_000,
    hookTimeout: 45_000,
    fileParallelism: false,
    maxWorkers: 1,
    coverage: { reporter: ["text", "html"] }
  }
});
