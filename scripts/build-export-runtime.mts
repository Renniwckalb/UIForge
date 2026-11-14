/**
 * Compile le rendu serveur de l'export Web Component (src/forge/export/web-component-server.tsx)
 * en un module autonome : .forge/web-component-export.mjs, chargé par /api/export.
 * Next.js n'autorise pas react-dom/server dans les routes ; ce module a donc son propre bundle.
 *
 * Lancé automatiquement par predev et prebuild. Usage : npm run build:export-runtime
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), ".forge", "web-component-export.mjs");
mkdirSync(join(process.cwd(), ".forge"), { recursive: true });
await build({
  entryPoints: [join(process.cwd(), "src/forge/export/web-component-server.tsx")],
  outfile: out,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  jsx: "automatic",
  alias: { "@": join(process.cwd(), "src") },
  define: { "process.env.NODE_ENV": '"production"' },
  // modules CommonJS (React) importés depuis un bundle ESM
  banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  logLevel: "warning",
  logOverride: { "unsupported-dynamic-import": "silent" },
});
console.log(`✓ ${out}`);
