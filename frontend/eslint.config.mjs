import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      // Full reloads after auth changes are intentional: the store re-reads the session cookie.
      "@next/next/no-location-assign-relative-destination": "off",
      // React Compiler advisories — the "latest ref" and load-on-mount patterns are deliberate here.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
