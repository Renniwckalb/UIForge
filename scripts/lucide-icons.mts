/**
 * Génère src/forge/generated/lucide-icons.ts : la liste des noms d'icônes Lucide (noms canoniques,
 * ceux de l'objet `icons` de lucide-react) qui ont un export `<Nom>Icon`.
 *
 * La liste seule (quelques dizaines de Ko) suffit pour valider une spec, relire le code et chercher une
 * icône : les composants des icônes ne sont chargés qu'à la demande (runtime/icons.ts).
 * Lancé par predev et prebuild, idempotent. Usage : npx tsx scripts/lucide-icons.mts
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const lucide = (await import("lucide-react")) as unknown as Record<string, unknown> & { icons: Record<string, unknown> };
const version: string = require("lucide-react/package.json").version;

const names = Object.keys(lucide.icons)
  .filter((n) => lucide[`${n}Icon`] === lucide.icons[n])
  .sort();
if (names.length < 1000) throw new Error(`lucide-react : seulement ${names.length} icônes trouvées`);

// Anciens noms encore exportés (Trash2Icon → Trash…) : acceptés et convertis vers le nom canonique
const canonicalOf = new Map(names.map((n) => [lucide.icons[n], n]));
const known = new Set(names);
const aliases: Record<string, string> = {};
for (const k of Object.keys(lucide).sort()) {
  if (!k.endsWith("Icon") || k.startsWith("Lucide")) continue;
  const base = k.slice(0, -4);
  const target = canonicalOf.get(lucide[k]);
  if (base && target && !known.has(base) && base !== target) aliases[base] = target;
}

const out = join(process.cwd(), "src", "forge", "generated", "lucide-icons.ts");
const body = `/* Fichier généré par scripts/lucide-icons.mts — ne pas modifier à la main. */

/** Version de lucide-react dont proviennent les noms */
export const LUCIDE_VERSION = ${JSON.stringify(version)};

/** Noms canoniques des icônes Lucide (PascalCase), triés ; chaque icône est exportée sous <Nom>Icon */
export const LUCIDE_ICON_NAMES: readonly string[] = ${JSON.stringify(names.join(" "))}.split(" ");

/** Anciens noms (alias encore exportés par lucide-react) → nom canonique */
export const LUCIDE_ICON_ALIASES: Readonly<Record<string, string>> = Object.fromEntries(
  ${JSON.stringify(Object.entries(aliases).map(([a, c]) => `${a}:${c}`).join(" "))}.split(" ").map((p) => p.split(":")),
);
`;
writeFileSync(out, body);
console.log(`lucide-icons : ${names.length} icônes, ${Object.keys(aliases).length} alias (lucide-react ${version}) → ${out}`);
