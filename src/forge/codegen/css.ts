import { getLocale, tr, translateNodeName } from "../../i18n/core";
import type { AnimationSpec, Breakpoint, ComponentDoc, Node, StyleDecl, StyleKey, StyleState, StyleValue } from "../model/types";
import { BREAKPOINTS, BREAKPOINT_MIN, STYLE_KEYS, STYLE_STATES } from "../model/types";
import { toKebab, walk } from "../model/ops";
import { COLOR_TOKENS, RADIUS_STEPS, tokenVar } from "../tokens/theme";
import { findBrick } from "../bricks/registry";
import { VENDOR_SOURCES } from "../generated/vendor-sources";

/** @keyframes nécessaires aux primitives copiées (Magic UI…), embarqués dans styles.css */
export function vendorKeyframes(doc: ComponentDoc): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    const v = VENDOR_SOURCES[f];
    if (!v) return;
    if (v.css) out.push(v.css);
    v.local.forEach(visit);
  };
  walk(doc, (n) => findBrick(n.brick)?.library.vendored?.forEach(visit));
  return [...new Set(out)].join("\n");
}

export function scopeClass(doc: ComponentDoc): string {
  const k = toKebab(doc.name) || "composant";
  return /^[a-z]/.test(k) ? k : `c-${k}`;
}
export function nodeClass(doc: ComponentDoc, id: string): string {
  return `${scopeClass(doc)}__${id}`;
}

export const STYLE_CSS: Record<StyleKey, string[]> = {
  bg: ["background-color"],
  fg: ["color"],
  borderColor: ["border-color"],
  borderWidth: ["border-width"],
  radius: ["border-radius"],
  shadow: ["box-shadow"],
  px: ["padding-inline"],
  py: ["padding-block"],
  mt: ["margin-top"],
  mb: ["margin-bottom"],
  gap: ["gap"],
  width: ["width"],
  maxWidth: ["max-width"],
  minHeight: ["min-height"],
  fontFamily: ["font-family"],
  fontSize: ["font-size"],
  fontWeight: ["font-weight"],
  lineHeight: ["line-height"],
  textAlign: ["text-align"],
  opacity: ["opacity"],
};

export function styleVarName(id: string, key: StyleKey) {
  return `--${id}-${toKebab(key)}`;
}

export function styleValueCss(v: StyleValue): string {
  return "token" in v ? tokenVar(v.token) : v.value;
}

const STATE_SELECTORS: Record<StyleState, string[]> = {
  hover: [":hover:not(:disabled)"],
  focus: [":focus-visible"],
  active: [":active:not(:disabled)"],
  disabled: [":disabled", "[data-disabled]", '[aria-disabled="true"]'],
};

function declLines(id: string, decl: StyleDecl, indent = "  "): string[] {
  const lines: string[] = [];
  for (const key of STYLE_KEYS) {
    const v = decl[key];
    if (!v) continue;
    const varName = styleVarName(id, key);
    lines.push(`${indent}${varName}: ${styleValueCss(v)};`);
    for (const prop of STYLE_CSS[key]) lines.push(`${indent}${prop}: var(${varName});`);
    if (key === "borderWidth") lines.push(`${indent}border-style: solid;`);
  }
  return lines;
}

const KEYFRAMES: Record<string, string> = {
  fade: "from { opacity: 0; } to { opacity: 1; }",
  "fade-up": "from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }",
  "pop-in": "from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); }",
  "slide-up": "from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; }",
  "slide-down": "from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: none; }",
  scale: "from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; }",
  "blur-in": "from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: none; }",
};
const HOVER_TRANSFORM: Record<string, string> = {
  fade: "opacity: 0.85;",
  "fade-up": "transform: translateY(-2px);",
  "pop-in": "transform: scale(1.02);",
  "slide-up": "transform: translateY(-3px);",
  "slide-down": "transform: translateY(3px);",
  scale: "transform: scale(1.03);",
  "blur-in": "filter: brightness(1.05);",
};

function animationCss(scope: string, cls: string, id: string, a: AnimationSpec): string[] {
  if (a.preset === "none") return [];
  const out: string[] = [];
  const v = (k: string) => `--${id}-anim-${k}`;
  const vars = `  ${v("duration")}: ${a.durationMs}ms;\n  ${v("delay")}: ${a.delayMs}ms;\n  ${v("easing")}: ${a.easing};`;
  if (a.on === "hover") {
    out.push(`.${cls} {\n${vars}\n  transition: transform var(${v("duration")}) var(${v("easing")}) var(${v("delay")}), opacity var(${v("duration")}) var(${v("easing")}), filter var(${v("duration")}) var(${v("easing")});\n}`);
    out.push(`.${cls}:hover {\n  ${HOVER_TRANSFORM[a.preset]}\n}`);
    out.push(
      `@media (prefers-reduced-motion: reduce) {\n  .${cls} { transition: ${a.reducedMotion === "fade-only" ? `opacity var(${v("duration")})` : "none"}; }\n  .${cls}:hover { transform: none; filter: none; }\n}`,
    );
    return out;
  }
  out.push(`.${cls} {\n${vars}\n  animation: ${scope}-${a.preset} var(${v("duration")}) var(${v("easing")}) var(${v("delay")}) both;\n}`);
  if (a.on === "in-view") {
    out.push(`@supports (animation-timeline: view()) {\n  .${cls} { animation-timeline: view(); animation-range: entry 0% cover 30%; animation-delay: 0s; }\n}`);
  }
  out.push(
    `@media (prefers-reduced-motion: reduce) {\n  .${cls} { animation: ${a.reducedMotion === "fade-only" ? `${scope}-fade var(${v("duration")}) linear both` : "none"}; }\n}`,
  );
  return out;
}

export type CssOptions = {
  /** Ajoute les sélecteurs [data-forge-state] utilisés par le studio pour forcer un état */
  studio?: boolean;
  /**
   * Rendu des surcharges par breakpoint dans le studio (à l'export, ce sont les classes Tailwind
   * md:[…]! du TSX qui les appliquent) :
   *  - number : largeur simulée du canvas (les breakpoints atteints sont appliqués sans media query)
   *  - "media" : vraies media queries (iframe du mode Interactif)
   */
  breakpoints?: number | "media";
};

/* ——— Breakpoints ——— */

/** Variable CSS d'une valeur brute surchargée à un breakpoint : --card1-md-px */
export function bpVarName(id: string, bp: Breakpoint, key: StyleKey) {
  return `--${id}-${bp}-${toKebab(key)}`;
}

/** Valeur CSS d'une surcharge : token → var(--token), valeur brute → var(--id-bp-key) */
export function bpValueCss(id: string, bp: Breakpoint, key: StyleKey, v: StyleValue): string {
  return "token" in v ? tokenVar(v.token) : `var(${bpVarName(id, bp, key)})`;
}

/** Classes Tailwind générées pour les surcharges (ex. md:[padding-inline:var(--space-8)]!) */
export function breakpointClasses(node: Node): string[] {
  const out: string[] = [];
  for (const bp of BREAKPOINTS) {
    const decl = node.style[bp];
    if (!decl) continue;
    for (const key of STYLE_KEYS) {
      const v = decl[key];
      if (!v) continue;
      const value = bpValueCss(node.id, bp, key, v).replace(/ /g, "_");
      for (const prop of STYLE_CSS[key]) out.push(`${bp}:[${prop}:${value}]!`);
      if (key === "borderWidth") out.push(`${bp}:[border-style:solid]!`);
    }
  }
  return out;
}

/** Règles CSS équivalentes aux classes de breakpoint (rendu du studio) */
function breakpointRules(cls: string, node: Node, mode: number | "media"): string[] {
  const out: string[] = [];
  for (const bp of BREAKPOINTS) {
    const decl = node.style[bp];
    if (!decl || !Object.keys(decl).length) continue;
    if (typeof mode === "number" && mode < BREAKPOINT_MIN[bp]) continue;
    const lines: string[] = [];
    for (const key of STYLE_KEYS) {
      const v = decl[key];
      if (!v) continue;
      for (const prop of STYLE_CSS[key]) lines.push(`${prop}: ${bpValueCss(node.id, bp, key, v)} !important;`);
      if (key === "borderWidth") lines.push("border-style: solid !important;");
    }
    const rule = `.${cls} { ${lines.join(" ")} }`;
    out.push(mode === "media" ? `@media (width >= ${BREAKPOINT_MIN[bp] / 16}rem) { ${rule} }` : rule);
  }
  return out;
}

export function themeBlock(doc: ComponentDoc, scope: string): string {
  const t = doc.theme;
  const lines: string[] = [];
  lines.push(`.${scope} {`);
  lines.push(`  /* ${tr("Colors — light mode")} */`);
  for (const c of COLOR_TOKENS) lines.push(`  --${c}: ${t.color.light[c]};`);
  lines.push(`  /* ${tr("Radii")} */`);
  lines.push(`  --radius: ${t.radius};`);
  for (const [k, f] of Object.entries(RADIUS_STEPS)) lines.push(`  --radius-${k}: calc(var(--radius) * ${f});`);
  lines.push(`  /* ${tr("Spacing")} */`);
  for (const [k, v] of Object.entries(t.space)) lines.push(`  --space-${k}: ${v};`);
  lines.push(`  /* ${tr("Shadows")} */`);
  for (const [k, v] of Object.entries(t.shadow)) lines.push(`  --shadow-${k}: ${v};`);
  lines.push(`  /* ${tr("Typography")} */`);
  for (const [k, v] of Object.entries(t.font)) lines.push(`  --font-${k}: ${v};`);
  for (const [k, v] of Object.entries(t.fontSize)) lines.push(`  --text-${k}: ${v};`);
  lines.push("  color: var(--foreground);");
  lines.push("  font-family: var(--font-sans);");
  lines.push("}");
  const dark = COLOR_TOKENS.map((c) => `  --${c}: ${t.color.dark[c]};`).join("\n");
  lines.push("");
  lines.push(`/* ${tr('Colors — dark mode (colorScheme="dark", or "auto" + system preference)')} */`);
  lines.push(`.${scope}.dark {\n${dark}\n}`);
  lines.push(`@media (prefers-color-scheme: dark) {\n  .${scope}.auto {\n${dark.replace(/^/gm, "  ")}\n  }\n}`);
  lines.push("");
  lines.push(`@layer base {\n  .${scope},\n  .${scope} *,\n  .${scope} ::before,\n  .${scope} ::after {\n    border-color: var(--border);\n  }\n}`);
  return lines.join("\n");
}

export function nodeBlocks(doc: ComponentDoc, node: Node, opts: CssOptions = {}): string[] {
  const scope = scopeClass(doc);
  const cls = nodeClass(doc, node.id);
  const out: string[] = [];
  const base = declLines(node.id, node.style.base);
  // Valeurs brutes des surcharges par breakpoint (les tokens sont référencés directement par les classes md:…)
  for (const bp of BREAKPOINTS) {
    for (const key of STYLE_KEYS) {
      const v = node.style[bp]?.[key];
      if (v && "value" in v) base.push(`  ${bpVarName(node.id, bp, key)}: ${v.value};`);
    }
  }
  if (base.length) out.push(`.${cls} {\n${base.join("\n")}\n}`);
  for (const st of STYLE_STATES) {
    const decl = node.style[st];
    if (!decl || !Object.keys(decl).length) continue;
    const sels = STATE_SELECTORS[st].map((s) => `.${cls}${s}`);
    if (opts.studio) sels.push(`.${cls}[data-forge-state="${st}"]`);
    out.push(`${sels.join(",\n")} {\n${declLines(node.id, decl).join("\n")}\n}`);
  }
  if (node.animation) out.push(...animationCss(scope, cls, node.id, node.animation));
  if (opts.breakpoints !== undefined) out.push(...breakpointRules(cls, node, opts.breakpoints));
  return out;
}

export function generateCss(doc: ComponentDoc, opts: CssOptions = {}): string {
  const scope = scopeClass(doc);
  const parts: string[] = [];
  parts.push(`/* ${tr("{name} — styles generated by UI Forge.\n   Every setting goes through CSS variables: edit the tokens below to re-theme.", { name: doc.name })} */`);
  parts.push(themeBlock(doc, scope));

  const presets = new Set<string>();
  const nodeParts: string[] = [];
  walk(doc, (n) => {
    const blocks = nodeBlocks(doc, n, opts);
    if (blocks.length) nodeParts.push(`/* ${translateNodeName(getLocale(), n.name)} */\n${blocks.join("\n")}`);
    if (n.animation && n.animation.preset !== "none" && n.animation.on !== "hover") {
      presets.add(n.animation.preset);
      if (n.animation.reducedMotion === "fade-only") presets.add("fade");
    }
  });
  for (const p of presets) parts.push(`@keyframes ${scope}-${p} { ${KEYFRAMES[p]} }`);
  const vk = vendorKeyframes(doc);
  if (vk) parts.push(`/* ${tr("Animations of the copied primitives (Magic UI, tw-animate-css — MIT, see THIRD_PARTY_NOTICES.md)")} */
${vk}`);
  parts.push(...nodeParts);
  return parts.join("\n\n") + "\n";
}
