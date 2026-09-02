import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "mobile/**"],
  },
  resolve: {
    alias: [
      { find: "@logbook/shared/types", replacement: path.resolve(__dirname, "packages/shared/src/types/index.ts") },
      { find: /^@logbook\/shared\/(.*)$/, replacement: path.resolve(__dirname, "packages/shared/src") + "/$1" },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
});
