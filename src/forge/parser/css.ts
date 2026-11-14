/**
 * styles.css (édité dans Monaco) → tokens du thème + styles/animations des nœuds.
 * Comprend le format produit par codegen/css.ts ; le reste est signalé et ignoré.
 */
import { tr } from "../../i18n/core";
import type { AnimationSpec, Breakpoint, ComponentDoc, Diagnostic, StyleDecl, StyleKey, StyleState, StyleValue } from "../model/types";
import { BREAKPOINTS, STYLE_KEYS } from "../model/types";
import { toKebab } from "../model/ops";
import { COLOR_TOKENS, RADIUS_STEPS } from "../tokens/theme";
import { scopeClass } from "../codegen/css";

type Rule = { selector: string; decls: { prop: string; value: string; line: number }[]; children: Rule[]; line: number };

function lineAt(src: string, idx: number) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

/** Mini-parseur CSS (règles imbriquées pour @media/@supports/@layer) */
export function parseCssRules(src: string): { rules: Rule[]; error?: Diagnostic } {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  let i = 0;
  const parseBlock = (depth: number): Rule[] => {
    const rules: Rule[] = [];
    let buf = "";
    let bufStart = i;
    const decls: Rule["decls"] = [];
    while (i < clean.length) {
      const c = clean[i];
      if (c === "{") {
        const selector = buf.trim();
        const line = lineAt(clean, bufStart + (buf.length - buf.trimStart().length));
        i++;
        const start = i;
        // déclarations + règles enfants
        const inner = parseInner();
        rules.push({ selector, decls: inner.decls, children: inner.children, line });
        void start;
        buf = "";
        bufStart = i;
        continue;
      }
      if (c === "}") {
        if (depth === 0) throw new Error(tr("Unexpected closing brace (line {line})", { line: lineAt(clean, i) }));
        return rules;
      }
      if (c === ";" && depth === 0) {
        buf = "";
        bufStart = i + 1;
        i++;
        continue;
      }
      buf += c;
      i++;
    }
    if (depth > 0) throw new Error(tr("Missing closing brace"));
    void decls;
    return rules;
  };
  const parseInner = (): { decls: Rule["decls"]; children: Rule[] } => {
    const decls: Rule["decls"] = [];
    const children: Rule[] = [];
    let buf = "";
    let bufStart = i;
    while (i < clean.length) {
      const c = clean[i];
      if (c === "{") {
        const selector = buf.trim();
        const line = lineAt(clean, bufStart + (buf.length - buf.trimStart().length));
        i++;
        const inner = parseInner();
        children.push({ selector, decls: inner.decls, children: inner.children, line });
        buf = "";
        bufStart = i;
        continue;
      }
      if (c === "}") {
        if (buf.trim()) pushDecl(buf, bufStart);
        i++;
        return { decls, children };
      }
      if (c === ";") {
        pushDecl(buf, bufStart);
        buf = "";
        i++;
        bufStart = i;
        continue;
      }
      buf += c;
      i++;
    }
    throw new Error(tr("Missing closing brace"));
    function pushDecl(text: string, start: number) {
      const t = text.trim();
      if (!t) return;
      const k = t.indexOf(":");
      if (k < 0) return;
      decls.push({ prop: t.slice(0, k).trim(), value: t.slice(k + 1).trim(), line: lineAt(clean, start + (text.length - text.trimStart().length)) });
    }
  };
  try {
    return { rules: parseBlock(0) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/ligne (\d+)/);
    return { rules: [], error: { severity: "error", message: tr("Invalid CSS: {msg}", { msg }), line: m ? Number(m[1]) : undefined, column: 1 } };
  }
}

export function cssValueToStyle(value: string): StyleValue {
  const m = value.match(/^var\(--([\w-]+)\)$/);
  if (m) {
    const v = m[1];
    if ((COLOR_TOKENS as readonly string[]).includes(v)) return { token: `color.${v}` };
    if (v.startsWith("radius-") && v.slice(7) in RADIUS_STEPS) return { token: `radius.${v.slice(7)}` };
    for (const [prefix, group] of [["space-", "space"], ["shadow-", "shadow"], ["font-", "font"], ["text-", "text"]] as const) {
      if (v.startsWith(prefix)) return { token: `${group}.${v.slice(prefix.length)}` };
    }
  }
  return { value };
}

const KEY_BY_KEBAB = new Map<string, StyleKey>(STYLE_KEYS.map((k) => [toKebab(k), k]));
const STATE_OF: [RegExp, StyleState][] = [
  [/:hover/, "hover"],
  [/:focus-visible/, "focus"],
  [/:active/, "active"],
  [/:disabled|\[data-disabled\]|aria-disabled/, "disabled"],
];

export function parseCss(css: string, prev: ComponentDoc): { doc: ComponentDoc | null; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const { rules, error } = parseCssRules(css);
  if (error) return { doc: null, diagnostics: [error] };
  const doc: ComponentDoc = structuredClone(prev);
  const scope = scopeClass(doc);
  const nodePrefix = `.${scope}__`;

  // On repart de styles vides pour les nœuds : le CSS est la source pour cette édition
  const styles: Record<string, Partial<Record<"base" | StyleState, StyleDecl>>> = {};
  const anims: Record<string, Partial<AnimationSpec> & { found?: boolean }> = {};
  // Surcharges par breakpoint : les valeurs brutes sont dans styles.css, les tokens dans les classes md:… du TSX
  const bpRaw: Record<string, Partial<Record<Breakpoint, StyleDecl>>> = {};
  for (const id of Object.keys(doc.nodes)) {
    styles[id] = { base: {} };
    anims[id] = {};
    bpRaw[id] = {};
  }

  const handleNodeRule = (r: Rule, ctxAt: string) => {
    const sels = r.selector.split(",").map((s) => s.trim());
    const first = sels[0];
    const m = first.match(new RegExp(`^\\.${scope}__([A-Za-z]+\\d+)(.*)$`));
    if (!m) return false;
    const [, id, rest] = m;
    if (!doc.nodes[id]) {
      diagnostics.push({ severity: "warning", message: tr("Node “{id}” does not exist (rule ignored).", { id }), line: r.line });
      return true;
    }
    const state = rest ? STATE_OF.find(([re]) => re.test(rest))?.[1] : undefined;
    const layer: "base" | StyleState = state ?? "base";
    for (const d of r.decls) {
      if (d.prop.startsWith(`--${id}-anim-`)) {
        const k = d.prop.slice(`--${id}-anim-`.length);
        if (k === "duration") anims[id].durationMs = parseFloat(d.value);
        if (k === "delay") anims[id].delayMs = parseFloat(d.value);
        if (k === "easing") anims[id].easing = d.value;
        anims[id].found = true;
        continue;
      }
      const bpm = d.prop.match(new RegExp(`^--${id}-(${BREAKPOINTS.join("|")})-([\\w-]+)$`));
      if (bpm) {
        const key = KEY_BY_KEBAB.get(bpm[2]);
        if (key) (bpRaw[id][bpm[1] as Breakpoint] ??= {})[key] = { value: d.value };
        continue;
      }
      if (d.prop.startsWith(`--${id}-`)) {
        const key = KEY_BY_KEBAB.get(d.prop.slice(id.length + 3));
        if (!key) {
          diagnostics.push({ severity: "warning", message: tr("Unknown variable “{prop}” (ignored).", { prop: d.prop }), line: d.line });
          continue;
        }
        if (ctxAt === "reduced-motion") continue;
        (styles[id][layer] ??= {})[key] = cssValueToStyle(d.value);
        continue;
      }
      if (d.prop === "animation") {
        const am = d.value.match(new RegExp(`${scope}-([\\w-]+)`));
        if (ctxAt === "reduced-motion") {
          anims[id].reducedMotion = d.value === "none" ? "disable" : "fade-only";
        } else if (am) {
          anims[id].preset = am[1] as AnimationSpec["preset"];
          anims[id].on ??= "mount";
        }
        continue;
      }
      if (d.prop === "animation-timeline" && ctxAt === "supports") {
        anims[id].on = "in-view";
        continue;
      }
      if (d.prop === "transition") {
        if (ctxAt === "reduced-motion") anims[id].reducedMotion = d.value === "none" ? "disable" : "fade-only";
        else anims[id].on = "hover";
        continue;
      }
      if (ctxAt === "reduced-motion" || ctxAt === "supports") continue;
      if (state === "hover" && /^(transform|filter|opacity)$/.test(d.prop) && anims[id].on === "hover") {
        const v = d.value;
        anims[id].preset = d.prop === "opacity" ? "fade" : d.prop === "filter" ? "blur-in" : v.includes("scale") ? "scale" : v.includes("-") ? "slide-up" : "slide-down";
        continue;
      }
      if (d.prop.startsWith("--") || /var\(--/.test(d.value) || d.prop === "border-style") continue; // propriétés générées
      diagnostics.push({ severity: "warning", message: tr("“{decl}”: raw value not applied. Use a --{id}-… variable (tokens).", { decl: `${d.prop}: ${d.value}`, id }), line: d.line });
    }
    return true;
  };

  const themeLight: Record<string, string> = {};
  const themeDark: Record<string, string> = {};
  const readTheme = (r: Rule, target: Record<string, string>) => {
    for (const d of r.decls) {
      if (!d.prop.startsWith("--")) continue;
      target[d.prop.slice(2)] = d.value;
    }
  };

  const visit = (r: Rule, ctxAt: string) => {
    const sel = r.selector;
    if (sel.startsWith("@keyframes") || sel.startsWith("@layer")) return;
    if (sel.startsWith("@media") && /prefers-color-scheme/.test(sel)) return;
    if (sel.startsWith("@media") && /prefers-reduced-motion/.test(sel)) {
      r.children.forEach((c) => visit(c, "reduced-motion"));
      return;
    }
    if (sel.startsWith("@supports")) {
      r.children.forEach((c) => visit(c, "supports"));
      return;
    }
    if (sel === `.${scope}`) return readTheme(r, themeLight);
    if (sel === `.${scope}.dark`) return readTheme(r, themeDark);
    if (sel.startsWith(nodePrefix) && handleNodeRule(r, ctxAt)) return;
    diagnostics.push({ severity: "warning", message: tr("Rule “{sel}” not supported (ignored).", { sel: sel.slice(0, 60) }), line: r.line });
  };
  rules.forEach((r) => visit(r, ""));

  // Thème
  const t = doc.theme;
  for (const [k, v] of Object.entries(themeLight)) {
    if ((COLOR_TOKENS as readonly string[]).includes(k)) t.color.light[k] = v;
    else if (k === "radius") t.radius = v;
    else if (k.startsWith("radius-")) continue;
    else if (k.startsWith("space-")) t.space[k.slice(6)] = v;
    else if (k.startsWith("shadow-")) t.shadow[k.slice(7)] = v;
    else if (k.startsWith("font-") && k.slice(5) in t.font) (t.font as Record<string, string>)[k.slice(5)] = v;
    else if (k.startsWith("text-")) t.fontSize[k.slice(5)] = v;
    else diagnostics.push({ severity: "info", message: tr("Unknown token “--{k}” (ignored).", { k }) });
  }
  for (const [k, v] of Object.entries(themeDark)) if ((COLOR_TOKENS as readonly string[]).includes(k)) t.color.dark[k] = v;

  // Styles des nœuds
  for (const [id, layers] of Object.entries(styles)) {
    const n = doc.nodes[id];
    n.style = { base: layers.base ?? {} };
    const prevStyle = prev.nodes[id]?.style ?? { base: {} };
    for (const st of ["hover", "focus", "active", "disabled"] as StyleState[]) if (layers[st] && Object.keys(layers[st]!).length) n.style[st] = layers[st];
    for (const bp of BREAKPOINTS) {
      const decl: StyleDecl = {};
      for (const [k, v] of Object.entries(prevStyle[bp] ?? {})) if (v && "token" in v) decl[k as StyleKey] = v; // tokens : gérés par le TSX
      Object.assign(decl, bpRaw[id][bp] ?? {});
      if (Object.keys(decl).length) n.style[bp] = decl;
    }
    const a = anims[id];
    if (a.preset && a.preset !== "none") {
      n.animation = {
        preset: a.preset,
        on: a.on ?? "mount",
        durationMs: a.durationMs ?? 400,
        delayMs: a.delayMs ?? 0,
        easing: a.easing ?? "ease-out",
        reducedMotion: a.reducedMotion ?? "disable",
      };
    } else delete n.animation;
  }
  return { doc, diagnostics };
}
