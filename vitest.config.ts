/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
