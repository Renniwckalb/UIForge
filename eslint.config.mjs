import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bundle généré par scripts/build-export-runtime.mts
    ".forge/**",
    // Sources tierces copiées telles quelles par le CLI shadcn (shadcn/ui, Magic UI, Aceternity UI)
    "src/vendor/**",
    "src/forge/generated/**",
  ]),
]);

export default eslintConfig;
