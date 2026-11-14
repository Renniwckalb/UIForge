/**
 * Prépare les sources « vendored » (copiées par le CLI shadcn dans src/vendor/ui) pour l'export :
 *  1. réécrit les utilitaires de couleur du thème (bg-primary → bg-(color:--primary)) pour qu'ils
 *     fonctionnent dans un projet Tailwind v4 vierge, sans configuration de thème ;
 *  2. remplace les variantes personnalisées de shadcn (data-open:, data-checked:…) par des variantes
 *     arbitraires standard, et les utilitaires de tw-animate-css (animate-in, fade-in-0, zoom-in-95…)
 *     par des valeurs arbitraires ; les @keyframes nécessaires sont embarqués avec le fichier ;
 *  3. supprime les variantes dark: (le mode sombre passe par les tokens du composant) ;
 *  4. rend les imports internes relatifs (./button) et remplace @/lib/utils par le paquet `cn` ;
 *  5. génère src/forge/generated/vendor-sources.ts : code, dépendances npm, keyframes, origine (licence).
 * Les commentaires (dont les en-têtes de copyright éventuels) ne sont jamais modifiés.
 * Idempotent : peut être relancé après chaque `shadcn add`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const VENDOR = join(ROOT, "src", "vendor");
const OUT = join(ROOT, "src", "forge", "generated", "vendor-sources.ts");

/** Origine de chaque fichier copié (sert à THIRD_PARTY_NOTICES.md) — défaut : shadcn/ui */
const ORIGIN: Record<string, string> = {
  "ui/shimmer-button.tsx": "magicui",
  "ui/border-beam.tsx": "magicui",
  "ui/dot-pattern.tsx": "magicui",
  "ui/marquee.tsx": "magicui",
  "ui/word-rotate.tsx": "magicui",
  "ui/animated-grid-pattern.tsx": "magicui",
  "ui/text-animate.tsx": "magicui",
};

const COLORS = [
  "background", "foreground", "card-foreground", "card", "popover-foreground", "popover",
  "primary-foreground", "primary", "secondary-foreground", "secondary", "muted-foreground", "muted",
  "accent-foreground", "accent", "destructive", "border", "input", "ring",
];
const UTIL = "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|caret|accent|decoration|shadow|inset-shadow|inset-ring";
const COLOR_RE = new RegExp(`^(-?)(${UTIL})-(${COLORS.join("|")})(\\/[\\w.%\\[\\]]+)?$`);

/* ——— Variantes personnalisées de shadcn (shadcn/tailwind.css) ——— */
const shadcnCss = readFileSync(join(ROOT, "node_modules", "shadcn", "dist", "tailwind.css"), "utf8");
const CUSTOM_VARIANTS = new Map<string, string>();
for (const m of shadcnCss.matchAll(/@custom-variant ([\w-]+) \{([\s\S]*?)\{\s*@slot;/g)) {
  const sels = [...m[2].matchAll(/&:where\((.+)\)\s*,?\s*$/gm)].map((s) => s[1].replace(/"/g, "").replace(/\s+/g, "_"));
  if (sels.length) CUSTOM_VARIANTS.set(m[1], `[&:is(${sels.join(",")})]`);
}

/* ——— tw-animate-css : utilitaires → valeurs arbitraires ——— */
const twAnimate = readFileSync(join(ROOT, "node_modules", "tw-animate-css", "dist", "tw-animate.css"), "utf8");
const TW_ANIM_KEYFRAMES = new Map<string, string>();
for (const name of ["enter", "exit"]) {
  const start = twAnimate.indexOf(`@keyframes ${name} {`);
  if (start >= 0) TW_ANIM_KEYFRAMES.set(name, extractBlock(twAnimate, start));
}
const ANIM_SHORTHAND = (kf: string) =>
  `animate-[${kf}_var(--tw-animation-duration,var(--tw-duration,.15s))_var(--tw-ease,ease)_var(--tw-animation-delay,0s)_var(--tw-animation-iteration-count,1)_var(--tw-animation-direction,normal)_var(--tw-animation-fill-mode,none)]`;
function twAnimateUtility(util: string): { cls: string; kf?: string } | null {
  if (util === "animate-in") return { cls: ANIM_SHORTHAND("enter"), kf: "enter" };
  if (util === "animate-out") return { cls: ANIM_SHORTHAND("exit"), kf: "exit" };
  let m = util.match(/^fade-(in|out)(?:-(\d+))?$/);
  if (m) return { cls: `[--tw-${m[1] === "in" ? "enter" : "exit"}-opacity:${m[2] ? Number(m[2]) / 100 : 0}]` };
  m = util.match(/^zoom-(in|out)(?:-(\d+))?$/);
  if (m) return { cls: `[--tw-${m[1] === "in" ? "enter" : "exit"}-scale:${m[2] ? Number(m[2]) / 100 : 0}]` };
  m = util.match(/^slide-(in|out)-from-(top|bottom|left|right)(?:-(\d+))?$/);
  if (m) {
    const axis = m[2] === "top" || m[2] === "bottom" ? "y" : "x";
    const sign = m[2] === "top" || m[2] === "left" ? "-" : "";
    const amount = m[3] ? `calc(var(--spacing)*${m[3]})` : "100%";
    return { cls: `[--tw-${m[1] === "in" ? "enter" : "exit"}-translate-${axis}:${sign ? `calc(${amount}*-1)` : amount}]` };
  }
  return null;
}

function extractBlock(src: string, start: number): string {
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  return "";
}

/* ——— Animations déclarées dans le @theme du studio par les registries (Magic UI…) ——— */
const globals = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");
const THEME_ANIMS = new Map<string, string>();
for (const m of globals.matchAll(/--animate-([\w-]+):\s*([^;]+);/g)) THEME_ANIMS.set(m[1], m[2].trim());
function themeKeyframes(name: string): string | null {
  const start = globals.indexOf(`@keyframes ${name} {`);
  return start < 0 ? null : extractBlock(globals, start).replace(/^\s+/gm, (m) => m.replace(/\t/g, "  "));
}

const usedKeyframes = new Map<string, Set<string>>();
const derivedFrom = new Map<string, Set<string>>();
let currentFile = "";
function markKeyframe(name: string) {
  if (!usedKeyframes.has(currentFile)) usedKeyframes.set(currentFile, new Set());
  usedKeyframes.get(currentFile)!.add(name);
}

function splitVariants(token: string): [string, string] {
  let depth = 0;
  let last = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) last = i;
  }
  return last === -1 ? ["", token] : [token.slice(0, last + 1), token.slice(last + 1)];
}

function rewriteVariants(variants: string): string {
  if (!variants) return variants;
  return variants
    .slice(0, -1)
    .split(/:(?![^[]*\])/)
    .map((v) => CUSTOM_VARIANTS.get(v) ?? v)
    .join(":") + ":";
}

function transformClassToken(token: string): string | null {
  const [rawVariants, util] = splitVariants(token);
  if (/(^|:)dark:/.test(rawVariants) || rawVariants.startsWith("dark:")) return null;
  const variants = rewriteVariants(rawVariants);
  const important = util.startsWith("!") ? "!" : "";
  const core = important ? util.slice(1) : util;
  const anim = core.match(/^animate-([\w-]+)$/);
  if (anim && THEME_ANIMS.has(anim[1])) {
    const value = THEME_ANIMS.get(anim[1])!;
    markKeyframe(value.split(/\s+/)[0]);
    return `${variants}${important}animate-[${value.replace(/\s+/g, "_")}]`;
  }
  const tw = twAnimateUtility(core);
  if (tw) {
    if (tw.kf) markKeyframe(tw.kf);
    if (!derivedFrom.has(currentFile)) derivedFrom.set(currentFile, new Set());
    derivedFrom.get(currentFile)!.add("tw-animate-css");
    return `${variants}${important}${tw.cls}`;
  }
  const m = core.match(COLOR_RE);
  if (!m) return `${variants}${util}`;
  const [, neg, prefix, color, opacity = ""] = m;
  return `${variants}${important}${neg}${prefix}-(color:--${color})${opacity}`;
}

function transformClassString(s: string): string {
  if (!/[a-z]-[a-z]/.test(s) && !s.includes(":")) return s;
  const parts = s.split(/(\s+)/);
  const out: string[] = [];
  for (const p of parts) {
    if (/^\s+$/.test(p) || p === "") {
      out.push(p);
      continue;
    }
    const t = transformClassToken(p);
    if (t !== null) out.push(t);
  }
  return out.join("").replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, (m) => (m.includes("\n") ? m : ""));
}

/** Transforme uniquement les littéraux entre guillemets doubles hors commentaires */
function transformSource(src: string): string {
  let code = src
    .replace(/from "@\/(?:components|vendor)\/ui\/([\w-]+)"/g, 'from "./$1"')
    .replace(/import \{ cn \} from "@\/lib\/utils"/g, 'import { cn } from "cn"');
  const out: string[] = [];
  let i = 0;
  while (i < code.length) {
    if (code.startsWith("/*", i)) {
      const end = code.indexOf("*/", i + 2);
      const stop = end < 0 ? code.length : end + 2;
      out.push(code.slice(i, stop));
      i = stop;
    } else if (code.startsWith("//", i)) {
      const end = code.indexOf("\n", i);
      const stop = end < 0 ? code.length : end;
      out.push(code.slice(i, stop));
      i = stop;
    } else if (code[i] === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"' && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      const inner = code.slice(i + 1, j);
      out.push(inner.startsWith("./") || /^(use client|react)$/.test(inner) ? `"${inner}"` : `"${transformClassString(inner)}"`);
      i = j + 1;
    } else {
      out.push(code[i]);
      i++;
    }
  }
  code = out.join("");
  return code;
}

function pkgName(spec: string) {
  if (spec.startsWith("@")) return spec.split("/").slice(0, 2).join("/");
  return spec.split("/")[0];
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : /\.(tsx?|css)$/.test(d.name) ? [join(dir, d.name)] : [],
  );
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const versions: Record<string, string> = { ...pkg.dependencies };

type Entry = { code: string; npm: string[]; local: string[]; css: string; origin: string; derived: string[] };
const entries: Record<string, Entry> = {};
for (const file of walk(VENDOR)) {
  const rel = relative(VENDOR, file).replace(/\\/g, "/"); // ui/button.tsx
  const original = readFileSync(file, "utf8");
  currentFile = rel;
  const code = transformSource(original);
  // Keyframes déjà convertis lors d'un passage précédent
  for (const m of code.matchAll(/animate-\[([\w-]+)_/g)) markKeyframe(m[1]);
  if (/--tw-(enter|exit)-/.test(code)) {
    if (!derivedFrom.has(rel)) derivedFrom.set(rel, new Set());
    derivedFrom.get(rel)!.add("tw-animate-css");
  }
  if (code !== original) writeFileSync(file, code);
  const npm = new Set<string>();
  const local = new Set<string>();
  for (const m of code.matchAll(/(?:from|import)\s+"([^"]+)"/g)) {
    const spec = m[1];
    if (spec.startsWith(".")) {
      const dir = rel.split("/").slice(0, -1).join("/");
      local.add(`${dir}/${spec.replace(/^\.\//, "")}.tsx`);
    } else if (!/^react(-dom)?(\/|$)/.test(spec)) npm.add(pkgName(spec));
  }
  const css = [...(usedKeyframes.get(rel) ?? [])]
    .map((k) => TW_ANIM_KEYFRAMES.get(k) ?? themeKeyframes(k))
    .filter(Boolean)
    .join("\n");
  entries[rel] = { code, npm: [...npm].sort(), local: [...local].sort(), css, origin: ORIGIN[rel] ?? "shadcn", derived: [...(derivedFrom.get(rel) ?? [])] };
}

const usedVersions: Record<string, string> = {};
const allNpm = new Set<string>(["cmdk", "@number-flow/react", "@base-ui/react", "radix-ui", "lucide-react", "motion", "cn", "class-variance-authority"]);
for (const e of Object.values(entries)) e.npm.forEach((n) => allNpm.add(n));
for (const n of allNpm) if (versions[n]) usedVersions[n] = versions[n];

mkdirSync(join(ROOT, "src", "forge", "generated"), { recursive: true });
writeFileSync(
  OUT,
  `// Fichier généré par scripts/vendor-sync.ts — ne pas modifier à la main.\n` +
    `export type VendorEntry = { code: string; npm: string[]; local: string[]; css: string; origin: string; derived: string[] };\n` +
    `export const VENDOR_SOURCES: Record<string, VendorEntry> = ${JSON.stringify(entries, null, 2)};\n\n` +
    `export const NPM_VERSIONS: Record<string, string> = ${JSON.stringify(usedVersions, null, 2)};\n`,
);
// Thème par défaut de Tailwind (MIT) pour compiler dans le navigateur les classes saisies à la main
writeFileSync(
  join(ROOT, "src", "forge", "generated", "tailwind-theme.ts"),
  `// Fichier généré par scripts/vendor-sync.ts depuis tailwindcss/theme.css et preflight.css (licence MIT, Tailwind Labs).\n` +
    `export const TAILWIND_THEME_CSS = ${JSON.stringify(readFileSync(join(ROOT, "node_modules", "tailwindcss", "theme.css"), "utf8"))};\n` +
    `// Reset de base, embarqué dans l'export HTML/CSS/JS autonome\n` +
    `export const TAILWIND_PREFLIGHT_CSS = ${JSON.stringify(readFileSync(join(ROOT, "node_modules", "tailwindcss", "preflight.css"), "utf8"))};\n`,
);
console.log(`vendor-sync : ${Object.keys(entries).length} fichiers → ${relative(ROOT, OUT)}`);
