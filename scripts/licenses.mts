/**
 * Inventaire et contrôle des licences.
 *   npm run licenses:check   → échoue si une dépendance (directe ou transitive) a une licence hors liste
 *                              autorisée sans exception « acceptée » au nom et à la licence exacts,
 *                              ou si une licence interdite en production (MPL, LGPL, GPL…) est requise
 *                              par le studio en production ou par un composant exporté.
 *   npm run licenses:report  → régénère LICENSES.md et src/forge/generated/licenses.ts (page « Licences »)
 * Les licences sont lues dans les package.json / fichiers LICENSE des paquets installés
 * (outil : license-checker-rseidelsohn), les sources copiées et polices sont décrites dans
 * src/forge/licenses/third-party.ts (vérifiées à leur source officielle).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NPM_LICENSES } from "../src/forge/licenses/third-party";
import { translate } from "../src/i18n/core";

const ROOT = process.cwd();
const mode = process.argv.includes("--write") ? "write" : "check";
type Exception = { package: string; license: string; scope: "prod" | "dev"; via: string; reason: string; status: "acceptée" | "refusée"; date: string; par: string };
const cfg = JSON.parse(readFileSync(process.env.LICENSES_CONFIG ?? join(ROOT, "licenses.exceptions.json"), "utf8")) as {
  allowed: string[];
  forbiddenInProduction: string[];
  exceptions: Exception[];
};
const ALLOWED = new Set(cfg.allowed);
const FORBIDDEN_PROD = new Set(cfg.forbiddenInProduction);

type Info = { licenses: string | string[]; repository?: string; publisher?: string; licenseFile?: string };
const run = (args: string) =>
  JSON.parse(execSync(`npx --no-install license-checker-rseidelsohn --json ${args}`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString()) as Record<string, Info>;

const all = run("");
const prod = new Set(Object.keys(run("--production")));

const alternatives = (expr: string) =>
  expr
    .replace(/\*$/, "")
    .replace(/[()]/g, "")
    .trim()
    .split(/\s+OR\s+/i)
    .map((alt) => alt.split(/\s+AND\s+/i).map((l) => l.trim()));
/** OR → une option entièrement autorisée suffit ; AND → toutes les licences de l'option doivent l'être */
const spdxAllowed = (expr: string) => alternatives(expr).some((alt) => alt.every((l) => ALLOWED.has(l)));
/** Licence interdite en production « requise » : présente dans toutes les options (pas de choix possible sans elle) */
const requiresForbidden = (expr: string) => alternatives(expr).every((alt) => alt.some((l) => FORBIDDEN_PROD.has(l)));

function licenseOf(i: Info) {
  return Array.isArray(i.licenses) ? i.licenses.join(" AND ") : String(i.licenses);
}
const nameOf = (key: string) => key.slice(0, key.lastIndexOf("@"));
const normLicense = (l: string) => l.replace(/[()*]/g, "").trim();

/* ——— Dépendances d'un composant exporté : fermeture transitive (package-lock) des paquets npm qu'un export peut demander ——— */
const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8")) as { packages: Record<string, { version?: string; dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> }> };
const exportClosure = new Set<string>();
const visit = (name: string) => {
  const entry = lock.packages[`node_modules/${name}`];
  if (!entry || exportClosure.has(`${name}@${entry.version}`)) return;
  exportClosure.add(`${name}@${entry.version}`);
  for (const d of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies })) visit(d);
};
Object.keys(NPM_LICENSES).forEach(visit);

// Hooks de test (scénarios négatifs) : simule la présence de paquets en production / dans un export
for (const [env, set] of [["LICENSES_SIMULATE_PROD", prod], ["LICENSES_SIMULATE_EXPORT", exportClosure]] as const)
  for (const n of (process.env[env] ?? "").split(",").filter(Boolean)) for (const key of Object.keys(all)) if (nameOf(key) === n) set.add(key);

const rows = Object.entries(all)
  .map(([key, info]) => {
    const license = licenseOf(info);
    const self = nameOf(key) === "ui-forge";
    const ok = spdxAllowed(license);
    const exc = ok || self ? undefined : cfg.exceptions.find((e) => e.package === nameOf(key) && normLicense(e.license) === normLicense(license));
    const scope = prod.has(key) ? "prod" : "dev";
    return { key, name: nameOf(key), version: key.slice(key.lastIndexOf("@") + 1), license, repo: info.repository ?? "", scope, inExport: exportClosure.has(key), ok, exc, self };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

const problems: { key: string; why: string }[] = [];
// Licence du projet lui-même : lue dans package.json (le paquet est « private », l'outil le marque UNLICENSED)
const projectLicense = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).license;
if (projectLicense !== "MIT") problems.push({ key: "ui-forge", why: `licence du projet : ${projectLicense ?? "aucune"} (MIT attendue)` });
for (const r of rows) {
  if (r.self) continue;
  if (r.inExport && !r.ok) problems.push({ key: r.key, why: `${r.license} — présent dans les dépendances d'un composant exporté, seules les licences autorisées y sont admises` });
  else if (r.scope === "prod" && requiresForbidden(r.license) && !(r.exc?.scope === "prod" && r.exc.status === "acceptée"))
    problems.push({ key: r.key, why: `${r.license} — licence interdite en production` });
  if (r.ok) continue;
  if (!r.exc) problems.push({ key: r.key, why: `${r.license} — hors liste, aucune exception pour ce nom et cette licence exacts` });
  else if (r.exc.status !== "acceptée") problems.push({ key: r.key, why: `${r.license} — exception « ${r.exc.status} »` });
  else if (r.exc.scope === "dev" && r.scope === "prod") problems.push({ key: r.key, why: `${r.license} — exception limitée au dev/build, mais le paquet est en production` });
}
// Toute licence MPL requise en production est refusée, même couverte par une exception (sauf exception explicitement « prod »)
for (const r of rows) {
  if (r.self || r.scope !== "prod" || !/MPL/.test(r.license) || !requiresForbidden(r.license)) continue;
  if (!problems.some((p) => p.key === r.key)) problems.push({ key: r.key, why: `${r.license} — MPL interdite dans les dépendances de production` });
}
// Exceptions devenues inutiles (paquet disparu ou licence changée) : signalées
const unused = cfg.exceptions.filter((e) => !rows.some((r) => r.exc === e));
const excepted = rows.filter((r) => r.exc && r.exc.status === "acceptée");

if (mode === "check") {
  console.log(`Licences : ${rows.length} paquets analysés (${rows.filter((r) => r.scope === "prod").length} en production, ${exportClosure.size} dans les dépendances des exports).`);
  console.log(`Liste autorisée : ${[...ALLOWED].join(", ")}`);
  if (excepted.length) {
    console.log(`\nExceptions acceptées (${excepted.length}) :`);
    for (const r of excepted) console.log(`  · ${r.key.padEnd(42)} ${r.license.padEnd(34)} [${r.scope}] acceptée le ${r.exc!.date} par ${r.exc!.par}`);
  }
  for (const e of unused) console.log(`  (exception sans effet : ${e.package} — ${e.license})`);
  const leak = [...exportClosure].filter((k) => /^(sharp|@img\/)/.test(k));
  if (leak.length) problems.push({ key: leak.join(", "), why: "sharp/libvips dans les dépendances d'un export" });
  if (problems.length) {
    console.error(`\n✗ ${problems.length} problème(s) :`);
    for (const p of problems) console.error(`  ✗ ${p.key.padEnd(42)} ${p.why}`);
    process.exit(1);
  }
  console.log(`\n✓ Toutes les licences sont autorisées ou couvertes par une exception acceptée ; aucune licence interdite en production ni dans les exports.`);
  process.exit(0);
}

/* ——— Rapport LICENSES.md ——— */
const { THIRD_PARTY, FONT_LICENSES } = await import("../src/forge/licenses/third-party");
const pending = excepted;
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const v = (n: string) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, "node_modules", n, "package.json"), "utf8")).version as string;
  } catch {
    return "—";
  }
};
const copyrightOf = (n: string) => {
  try {
    const dir = join(ROOT, "node_modules", n);
    const f = execSync(`ls "${dir}"`).toString().split("\n").find((x) => /^licen[cs]e/i.test(x));
    if (!f) return "";
    const line = readFileSync(join(dir, f), "utf8").split("\n").find((l) => /copyright/i.test(l) && !/copyright owner|copyright notice|copyright holder/i.test(l));
    return line?.trim() ?? "";
  } catch {
    return "";
  }
};

const RIGHTS: Record<string, string> = {
  MIT: "Usage, modification, redistribution (y compris commerciale) : oui — conserver la notice de copyright et de licence.",
  ISC: "Usage, modification, redistribution : oui — conserver la notice.",
  "Apache-2.0": "Usage, modification, redistribution : oui — conserver la licence et le fichier NOTICE, indiquer les modifications.",
  "BSD-3-Clause": "Usage, modification, redistribution : oui — conserver la notice, pas d'usage du nom des auteurs pour promotion.",
  "OFL-1.1": "Usage, modification, redistribution avec un logiciel : oui — pas de vente de la police seule ; noms réservés éventuels à respecter.",
};

type Main = { name: string; npm?: string; license: string; copyright?: string; source: string; note?: string };
const MAIN: Main[] = [
  { name: "shadcn/ui", npm: "shadcn", license: "MIT", copyright: "Copyright (c) 2023 shadcn", source: "https://github.com/shadcn-ui/ui/blob/main/LICENSE.md", note: "CLI + sources copiées dans src/vendor/ui et dans les exports" },
  { name: "Base UI", npm: "@base-ui/react", license: "MIT", source: "https://github.com/mui/base-ui/blob/master/LICENSE" },
  { name: "Radix UI", npm: "radix-ui", license: "MIT", source: "https://github.com/radix-ui/primitives/blob/main/LICENSE" },
  { name: "cmdk", npm: "cmdk", license: "MIT", copyright: "Copyright (c) 2022 Paco Coursey", source: "https://github.com/pacocoursey/cmdk/blob/main/LICENSE.md" },
  { name: "NumberFlow", npm: "@number-flow/react", license: "MIT", source: "https://github.com/barvian/number-flow (LICENSE.md du paquet)" },
  { name: "Magic UI", license: "MIT", copyright: "Copyright (c) Magic UI", source: "https://github.com/magicuidesign/magicui/blob/main/LICENSE.md", note: "composants gratuits uniquement (aucun composant Pro) ; sources copiées dans src/vendor/ui et dans les exports" },
  { name: "Beautiful UI", license: "MIT", copyright: "Copyright (c) 2026 Shane Levine", source: "https://beautifului.dev/license", note: "valeurs du préréglage de thème et règles d'animation (src/forge/tokens/beautiful-ui.ts)" },
  { name: "Next.js", npm: "next", license: "MIT", source: "https://github.com/vercel/next.js/blob/canary/license.md" },
  { name: "React", npm: "react", license: "MIT", source: "https://github.com/facebook/react/blob/main/LICENSE" },
  { name: "Tailwind CSS", npm: "tailwindcss", license: "MIT", source: "https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE", note: "theme.css embarqué pour compiler dans le navigateur les classes saisies à la main" },
  { name: "tw-animate-css", npm: "tw-animate-css", license: "MIT", source: "https://github.com/Wombosvideo/tw-animate-css (LICENSE du paquet)", note: "@keyframes enter/exit recopiés dans les exports qui utilisent le Dialogue" },
  { name: "dnd-kit", npm: "@dnd-kit/core", license: "MIT", source: "https://github.com/clauderic/dnd-kit/blob/master/LICENSE" },
  { name: "Monaco Editor", npm: "monaco-editor", license: "MIT", source: "https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt", note: "chargé localement (pas de CDN)" },
  { name: "@monaco-editor/react", npm: "@monaco-editor/react", license: "MIT", source: "https://github.com/suren-atoyan/monaco-react/blob/master/LICENSE" },
  { name: "Zustand", npm: "zustand", license: "MIT", source: "https://github.com/pmndrs/zustand/blob/main/LICENSE" },
];

const lines: string[] = [];
lines.push(
  "# Licences",
  "",
  `UI Forge est publié sous **licence MIT** (fichier [LICENSE](./LICENSE)). Inventaire généré par \`npm run licenses:report\` le ${new Date().toISOString().slice(0, 10)} ; contrôle : \`npm run licenses:check\`.`,
  "",
  `Liste autorisée : ${[...ALLOWED].join(", ")}. Interdites en production (studio et dépendances des exports) : ${[...FORBIDDEN_PROD].join(", ")}.`,
  "",
  "Aucune dépendance sous GPL/AGPL/LGPL n'a été ajoutée. Le seul composant LGPL présent, `@img/sharp-*` (libvips), est installé par Next.js comme dépendance optionnelle de `next/image` : accepté par le mainteneur, il n'est jamais exécuté (`images.unoptimized: true` dans `next.config.ts`) et n'est jamais inclus dans un composant exporté (vérifié par `licenses:check` et `verify:export`).",
  "",
  "## Technologies principales",
  "",
  "Licence vérifiée à la source officielle (fichier LICENSE du dépôt ou du paquet publié).",
  "",
  "| Technologie | Version | Licence | Copyright | Source | Droits | Remarque |",
  "| --- | --- | --- | --- | --- | --- | --- |",
);
for (const m of MAIN) {
  const c = m.copyright ?? (m.npm ? copyrightOf(m.npm) : "");
  lines.push(`| ${m.name} | ${m.npm ? v(m.npm) : "—"} | ${m.license} | ${c.replace(/\|/g, "\\|")} | ${m.source} | ${RIGHTS[m.license] ?? ""} | ${m.note ?? ""} |`);
}
lines.push(
  "",
  "## Retirés",
  "",
  "| Technologie | Raison |",
  "| --- | --- |",
  "| Aceternity UI | Aucune licence n'est indiquée pour les composants gratuits ; les conditions du site (ui.aceternity.com/terms) interdisent de republier, reproduire et redistribuer son contenu, et la licence Pro interdit la redistribution des sources. Composants retirés et remplacés par des équivalents Magic UI (MIT). |",
  "| Vaul | Licence MIT (Copyright (c) 2023 Emil Kowalski) compatible, mais dépôt déclaré non maintenu par son auteur (README, commit du 3 oct. 2025). Remplacé par le Drawer de Base UI. |",
  "",
  "## Code tiers copié dans les composants exportés",
  "",
  "Chaque export contient un fichier `THIRD_PARTY_NOTICES.md` qui ne liste que les bibliothèques réellement présentes, avec le texte complet de leur licence.",
  "",
  "| Origine | Licence | Copyright | Source | Repris |",
  "| --- | --- | --- | --- | --- |",
);
// LICENSES.md reste en français : descriptions traduites depuis l'anglais (langue source du code)
for (const t of Object.values(THIRD_PARTY)) lines.push(`| ${t.name} | ${t.license} | ${t.copyright} | ${translate("fr", t.source)} | ${translate("fr", t.usedFor)} |`);
lines.push("", "## Polices", "", "Aucun fichier de police n'est copié dans les exports : elles sont chargées via `next/font` (studio) et documentées dans le README des exports qui les utilisent.", "", "| Police | Licence | Copyright | Source |", "| --- | --- | --- | --- |");
for (const f of [...FONT_LICENSES, { name: "Geist / Geist Mono (interface du studio)", license: "OFL-1.1", copyright: "Copyright 2026 The Geist Project Authors", source: "https://github.com/vercel/geist-font/blob/main/OFL.txt" }])
  lines.push(`| ${f.name} | ${f.license} | ${f.copyright} | ${f.source} |`);
lines.push(
  "",
  "## Exceptions acceptées",
  "",
  "Paquets hors liste autorisée, acceptés nommément par le mainteneur (nom et licence exacts, `licenses.exceptions.json`). Un nouveau paquet, une licence modifiée ou un paquet « dev » apparaissant en production font échouer `npm run licenses:check`.",
  "",
  "| Paquet | Versions installées | Licence | Portée | Via | Justification | Statut |",
  "| --- | --- | --- | --- | --- | --- | --- |",
);
for (const e of cfg.exceptions) {
  const hits = rows.filter((r) => r.exc === e).map((r) => r.version);
  lines.push(`| ${e.package} | ${hits.join(", ") || "non installé"} | ${e.license} | ${e.scope} | ${e.via} | ${e.reason} | ${e.status} le ${e.date} par ${e.par} |`);
}
// Attributions requises par les licences Creative Commons (CC-BY)
const ccby = rows.filter((r) => /CC-BY-/.test(r.license));
const CC_ATTRIBUTION: Record<string, string> = {
  // Textes repris des fichiers LICENSE / README des paquets installés
  "caniuse-lite": "caniuse-lite (Ben Briggs, projet browserslist), « version allégée de caniuse-db » — données de compatibilité de https://caniuse.com, licence Creative Commons Attribution 4.0 International (fichier LICENSE du paquet). Utilisé par Next.js via browserslist.",
  "spdx-exceptions": "« Copyright © 2010-2015 Linux Foundation and its Contributors. Licensed under the Creative Commons Attribution License 3.0 Unported » (README du paquet).",
  "spdx-ranges": "Standard SPDX : Linux Foundation et contributeurs, Creative Commons Attribution License 3.0 Unported ; code du paquet : Copyright (c) 2015 Kyle E. Mitchell, MIT (README et LICENSE.md du paquet).",
};
lines.push("", "## Attributions (Creative Commons BY)", "", "| Paquet | Version | Licence | Portée | Attribution |", "| --- | --- | --- | --- | --- |");
for (const r of ccby) lines.push(`| ${r.name} | ${r.version} | ${r.license} | ${r.scope} | ${CC_ATTRIBUTION[r.name] ?? `Voir ${r.repo}`} |`);
lines.push("", `## Toutes les dépendances installées (${rows.length})`, "", "| Paquet | Version | Licence | Portée | Dépôt |", "| --- | --- | --- | --- | --- |");
for (const r of rows) if (!r.self) lines.push(`| ${r.name} | ${r.version} | ${r.license}${r.ok ? "" : " ⚠"} | ${r.scope} | ${r.repo} |`);
lines.push("");
writeFileSync(join(ROOT, "LICENSES.md"), lines.join("\n"));

// Données pour la page « Licences » du studio
writeFileSync(
  join(ROOT, "src", "forge", "generated", "licenses.ts"),
  `// Fichier généré par scripts/licenses.mts — ne pas modifier à la main.\nexport const LICENSES_MD = ${JSON.stringify(lines.join("\n"))};\nexport const PROJECT_LICENSE = ${JSON.stringify(pkg.license)};\n`,
);
console.log(`LICENSES.md : ${rows.length} dépendances, ${pending.length} sous exception acceptée, ${problems.length} problème(s).`);
