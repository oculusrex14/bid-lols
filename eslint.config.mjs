import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Flat ESLint config for the TanStack Start app-builder template. */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".vercel/**",
      ".nitro/**",
      "node_modules/**",
      "src/routeTree.gen.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      // Complexity drift detectors (RC3, S-11). These are WARN: they flag a
      // function once it passes the "review" line so it gets noticed in PRs.
      // The HARD gate is `scripts/complexity-report.mjs --gate` in CI
      // (complexity >15, depth >5, function >120 non-blank lines in
      // src/+server/ = failure), which is stricter where it matters and
      // scoped to production code so test/scripts data blocks can't game it.
      "complexity": ["warn", 11],
      "max-depth": ["warn", 5],
    },
  },
  // Disable rules that conflict with Prettier formatting.
  prettier,
);
