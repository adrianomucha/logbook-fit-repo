// ESLint 9 flat config. Carries over the old .eslintrc.cjs one to one:
// eslint:recommended, typescript-eslint's recommended rules, and Next's
// core-web-vitals set (which brings React, hooks, a11y and import rules).
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// eslint-config-next 15 still ships legacy (eslintrc) configs; FlatCompat
// translates them. It already registers eslint-plugin-react-hooks, so the
// hooks rules come from here rather than a second copy of the plugin.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default tseslint.config(
  {
    // Build output (the local distDir lives under tmp/, see next.config.mjs)
    // and the native app, which has its own toolchain
    ignores: [".next/**", "dist/**", "tmp/**", "mobile/**", "next-env.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends("next/core-web-vitals"),
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
