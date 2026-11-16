/**
 * Export « JavaScript » : un composant autonome (Web Component), sans React ni bundler, rangé dans son
 * propre dossier et importable de toutes les façons (script classique, module ES, CommonJS, React).
 *
 *   <kebab-name>-js/index.html                       page principale de démonstration
 *                   components/<kebab>/index.js       module ES (import) : balisage, CSS et comportement
 *                                     <kebab>.umd.js  le même composant pour <script src>, require() et AMD
 *                                     react.js        composant React (enveloppe du Web Component)
 *                                     index.d.ts, react.d.ts, package.json, README.md, THIRD_PARTY_NOTICES.md
 *
 * Le composant est un élément personnalisé <kebab> à Shadow DOM : ses styles (thème, reset, utilitaires
 * Tailwind compilés) n'affectent pas la page hôte et ceux de la page ne l'affectent pas. Plusieurs
 * instances peuvent coexister ; chacune a ses props (attributs, propriétés, setProps) et son état.
 *
 * Ce module est pur (pas de DOM) : l'instantané HTML et le CSS Tailwind sont calculés par export/snapshot.
 */
import { tr } from "../../i18n/core";
import type { ComponentDoc, InteractionAction } from "../model/types";
import { toKebab, walk } from "../model/ops";
import { findBrick } from "../bricks/registry";
import { generateCss, scopeClass } from "../codegen/css";
import { collectProps, generateTsx, inputRefName, stateNames } from "../codegen/tsx";
import { collectVendored, thirdPartiesOf, toJs, usesPresetFonts } from "./bundle";
import { mitText } from "../licenses/third-party";

export type VanillaNode = {
  brick: string;
  open?: boolean;
  props: Record<string, string | number | boolean>;
  texts: Record<string, string | string[]>;
  actions?: InteractionAction[];
};

/** Où s'applique chaque prop du composant (mêmes noms que l'export React) */
export type PropBinding =
  | { kind: "text"; node: string; key: string; list: boolean }
  | { kind: "prop"; node: string; prop: string; type: "boolean" | "number" | "string" }
  | { kind: "color"; token: string }
  | { kind: "scheme" }
  | { kind: "class" };

/** Balisage pré-rendu d'un nœud pour chaque combinaison de ses props exposées (variantes de classes shadcn…) */
export type NodeVariants = { props: string[]; html: Record<string, string> };

export type PropValueOut = string | number | boolean | string[];

export type VanillaConfig = {
  name: string;
  scope: string;
  nodes: Record<string, VanillaNode>;
  props: Record<string, PropBinding>;
  defaults: Record<string, PropValueOut>;
  variants: Record<string, NodeVariants>;
  /** Textes du runtime (bouton fermer, liste vide) dans la langue de l'export */
  i18n: { close: string; noResults: string };
};

/** Classes utilisées uniquement par le runtime (éléments créés en JavaScript) */
export const RUNTIME_CLASSES = ["py-6", "text-center", "text-sm", "text-(color:--muted-foreground)", "block", "inline-block", "whitespace-pre", "sr-only"];

/** Briques dont les props exposées sont lues directement par le runtime (pas de variantes pré-rendues) */
const RUNTIME_PROP_BRICKS = new Set(["baseui.drawer", "cmdk.dialog", "cmdk.menu"]);

export function propBindings(doc: ComponentDoc) {
  const props: Record<string, PropBinding> = {};
  const defaults: Record<string, PropValueOut> = {};
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    if (!b) return;
    for (const tf of b.texts) {
      const t = n.texts[tf.key];
      if (!t?.expose) continue;
      props[t.propName] = { kind: "text", node: n.id, key: tf.key, list: tf.kind === "list" };
      defaults[t.propName] = tf.kind === "list" ? (Array.isArray(t.value) ? t.value : [t.value]) : String(t.value);
    }
  });
  for (const e of doc.exposedProps) {
    const n = doc.nodes[e.nodeId];
    const field = n && findBrick(n.brick)?.props[e.prop];
    if (!n || !field) continue;
    props[e.propName] = { kind: "prop", node: n.id, prop: e.prop, type: field.type === "boolean" ? "boolean" : field.type === "number" ? "number" : "string" };
    defaults[e.propName] = n.props[e.prop];
  }
  for (const e of doc.theme.exposed) {
    props[e.propName] = { kind: "color", token: e.token };
    defaults[e.propName] = "";
  }
  props.colorScheme = { kind: "scheme" };
  defaults.colorScheme = doc.theme.defaultScheme;
  props.className = { kind: "class" };
  defaults.className = "";
  return { props, defaults };
}

/** Props exposées à pré-rendre par nœud (énumérations et booléens), avec toutes leurs valeurs possibles */
export type VariantPlan = { nodeId: string; props: { propName: string; prop: string; values: (string | boolean)[] }[] }[];

export function variantPlan(doc: ComponentDoc, max = 256): VariantPlan {
  const byNode = new Map<string, VariantPlan[number]["props"]>();
  for (const e of doc.exposedProps) {
    const n = doc.nodes[e.nodeId];
    const b = n && findBrick(n.brick);
    const field = b?.props[e.prop];
    if (!n || !b || !field || RUNTIME_PROP_BRICKS.has(b.id)) continue;
    const values = field.type === "enum" ? field.options.map((o) => o.value) : field.type === "boolean" ? [false, true] : null;
    if (!values) continue;
    if (!byNode.has(n.id)) byNode.set(n.id, []);
    byNode.get(n.id)!.push({ propName: e.propName, prop: e.prop, values });
  }
  const out: VariantPlan = [];
  for (const [nodeId, props] of byNode) {
    // au-delà de `max` combinaisons, les props suivantes ne sont pas pré-rendues
    const kept: typeof props = [];
    let combos = 1;
    for (const p of props) {
      if (combos * p.values.length > max) continue;
      combos *= p.values.length;
      kept.push(p);
    }
    if (kept.length) out.push({ nodeId, props: kept });
  }
  return out;
}

/** Toutes les combinaisons de valeurs d'un plan de nœud */
export function combinations(props: VariantPlan[number]["props"]): (string | boolean)[][] {
  return props.reduce<(string | boolean)[][]>((acc, p) => acc.flatMap((c) => p.values.map((v) => [...c, v])), [[]]);
}

export function vanillaConfig(doc: ComponentDoc, variants: Record<string, NodeVariants> = {}): VanillaConfig {
  const { props, defaults } = propBindings(doc);
  const bound = new Set(Object.values(props).flatMap((b) => ("node" in b ? [b.node] : [])));
  const nodes: Record<string, VanillaNode> = {};
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    if (!b) return;
    const needs =
      !!b.state || !!b.effect || n.interactions.length > 0 || bound.has(n.id) || ["magicui.word-rotate", "magicui.text-animate", "magicui.animated-grid"].includes(b.id);
    if (!needs) return;
    const texts: Record<string, string | string[]> = {};
    for (const [k, t] of Object.entries(n.texts)) texts[k] = t.value;
    // le dessin SVG est déjà dans le balisage pré-rendu : inutile de le recopier dans la configuration
    const { markup: _markup, ...props } = n.props;
    void _markup;
    const v: VanillaNode = { brick: b.id, props: b.id === "html.svg" ? props : { ...n.props }, texts };
    if (b.state?.kind === "open") v.open = n.props[b.state.initialProp] === true;
    if (n.interactions.length) v.actions = n.interactions.map((i) => i.action);
    nodes[n.id] = v;
  });
  return { name: generateTsx(doc).componentName, scope: scopeClass(doc), nodes, props, defaults, variants, i18n: { close: tr("Close"), noResults: tr("No results.") } };
}

/* ——— Actions de clic « code personnalisé » ——— */

const IDENT = /^[A-Za-z_$][\w$]*$/;
const USES_REACT = /\buse[A-Z]\w*\s*\(|\bReact\./;

function syntaxOk(js: string) {
  try {
    // analyse syntaxique seulement : la fonction n'est jamais appelée ici
    new Function(js);
    return true;
  } catch {
    return false;
  }
}

function transpile(code: string): string | null {
  try {
    const js = toJs(code.trim().replace(/;?$/, ";")).trim();
    return syntaxOk(js) ? js : null;
  } catch {
    return null;
  }
}

const indent = (s: string, pad: string) => s.replace(/^/gm, pad);

/**
 * Convertit les actions personnalisées (TS/JS saisi dans l'onglet Code) en fonctions JavaScript.
 * Elles s'exécutent dans une portée qui reproduit celle du composant React :
 *  - états contrôlés : `drawer1Open` / `setDrawer1Open(v | (v) => …)` reliés au runtime
 *  - refs de champ : `command1InputRef.current`
 *  - props : mêmes noms que l'export React (valeurs courantes)
 *  - code conservé du module et du corps (hors hooks React), utilisé s'il s'exécute sans erreur
 */
export function customActionsJs(doc: ComponentDoc, propNames: string[]): string {
  const entries: { key: string; code: string; js: string | null }[] = [];
  walk(doc, (n) =>
    n.interactions.forEach((it, i) => {
      if (it.action.type === "custom") entries.push({ key: `${n.id}:${i}`, code: it.action.code, js: transpile(it.action.code) });
    }),
  );
  if (!entries.length) return "var CUSTOM = null;";

  const prologue: string[] = [];
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    const names = b && stateNames(n, b);
    if (names) prologue.push(`var ${names.value} = $.get(${JSON.stringify(n.id)}), ${names.setter} = $.setter(${JSON.stringify(n.id)});`);
    if (b?.effect?.kind === "hotkey" && b.effect.action === "focus") prologue.push(`var ${inputRefName(n)} = { current: $.input(${JSON.stringify(n.id)}) };`);
  });
  for (const p of propNames) if (IDENT.test(p)) prologue.push(`var ${p} = $.props[${JSON.stringify(p)}];`);
  prologue.push("var scopeClassName = $.root.className;");

  const preserved = [...(doc.preservedCode?.module ?? []), ...(doc.preservedCode?.body ?? [])]
    .filter((c) => !USES_REACT.test(c) && !/^\s*(import|export)\b/.test(c))
    .map((c) => {
      try {
        const js = toJs(c).trim();
        return syntaxOk(js) ? js : null;
      } catch {
        return null;
      }
    })
    .filter((c): c is string => !!c);

  const fns = entries
    .map((e) =>
      e.js
        ? `${JSON.stringify(e.key)}: function () {\n${indent(e.js, "  ")}\n}`
        : `${JSON.stringify(e.key)}: function () {\n  throw new Error("code not convertible to JavaScript (JSX or invalid syntax)");\n}`,
    )
    .join(",\n");
  const body = (withPreserved: boolean) => indent([...prologue, ...(withPreserved ? preserved : []), `return {\n${indent(fns, "  ")}\n};`].join("\n"), "    ");
  return [
    `/* Custom click actions, converted from the component code */`,
    `var CUSTOM = {`,
    `  full: ${preserved.length ? `function ($) {\n${body(true)}\n  }` : "null"},`,
    `  base: function ($) {\n${body(false)}\n  },`,
    `  source: ${indent(JSON.stringify(Object.fromEntries(entries.map((e) => [e.key, e.code])), null, 2), "  ").trimStart()}`,
    `};`,
  ].join("\n");
}

/** Styles propres au runtime (overlays, positionnement), indépendants de Tailwind */
export const RUNTIME_CSS = `/* ——— UI Forge runtime: overlays and floating elements ——— */
.fx-overlay { position: fixed; inset: 0; z-index: 50; display: flex; padding: 1rem; }
.fx-overlay[hidden] { display: none; }
.fx-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); opacity: 0; transition: opacity 200ms ease; }
.fx-overlay.fx-shown .fx-backdrop { opacity: 1; }
.fx-panel { position: relative; outline: none; max-height: calc(100vh - 2rem); overflow-y: auto; }
.fx-dialog { align-items: center; justify-content: center; }
.fx-dialog .fx-panel { opacity: 0; transform: scale(0.95); transition: opacity 150ms ease, transform 150ms ease; }
.fx-palette { align-items: flex-start; justify-content: center; padding-top: 15vh; }
.fx-palette .fx-panel { width: min(32rem, 92vw); opacity: 0; transform: scale(0.97); transition: opacity 150ms ease, transform 150ms ease; }
.fx-shown.fx-dialog .fx-panel, .fx-shown.fx-palette .fx-panel { opacity: 1; transform: none; }
.fx-drawer { padding: 0; }
.fx-drawer .fx-panel { transition: transform 400ms cubic-bezier(0.32, 0.72, 0, 1); max-height: 85vh; }
.fx-drawer[data-dir="bottom"] { align-items: flex-end; justify-content: center; }
.fx-drawer[data-dir="top"] { align-items: flex-start; justify-content: center; }
.fx-drawer[data-dir="left"] { justify-content: flex-start; }
.fx-drawer[data-dir="right"] { justify-content: flex-end; }
.fx-drawer[data-dir="left"] .fx-panel, .fx-drawer[data-dir="right"] .fx-panel { height: 100%; max-height: none; width: min(24rem, 90vw); }
.fx-drawer[data-dir="bottom"] .fx-panel { transform: translateY(100%); }
.fx-drawer[data-dir="top"] .fx-panel { transform: translateY(-100%); }
.fx-drawer[data-dir="left"] .fx-panel { transform: translateX(-100%); }
.fx-drawer[data-dir="right"] .fx-panel { transform: translateX(100%); }
.fx-shown.fx-drawer .fx-panel { transform: none; }
.fx-close { position: absolute; top: 0.75rem; right: 0.75rem; display: inline-flex; width: 1.75rem; height: 1.75rem; align-items: center; justify-content: center; border-radius: 0.375rem; opacity: 0.7; cursor: pointer; background: transparent; color: inherit; }
.fx-close:hover { opacity: 1; background: color-mix(in oklab, currentColor 8%, transparent); }
.fx-anchor { position: relative; display: inline-flex; }
.fx-float { position: absolute; z-index: 50; opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
.fx-float.fx-shown { opacity: 1; pointer-events: auto; }
.fx-float[hidden] { display: none; }
[data-fx-trigger] { cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  .fx-backdrop, .fx-panel, .fx-float { transition: none !important; }
}
`;

/**
 * Runtime JavaScript (ES2017, sans dépendance) d'UNE instance du composant. `CUSTOM` est déclaré dans la
 * même fonction englobante. `R` est la racine de rendu (ShadowRoot de l'élément), `initial` les props initiales.
 * Toutes les recherches d'éléments sont limitées à `R` ; les écouteurs globaux sont retirés par destroy().
 */
export const RUNTIME_JS = String.raw`function createRuntime(C, R, initial) {
  var root = R.querySelector("." + C.scope) || R.firstElementChild;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var api = {};
  var stack = [];
  var mounted = false;
  var cleanups = [];

  function on(target, type, fn) {
    target.addEventListener(type, fn);
    cleanups.push(function () { target.removeEventListener(type, fn); });
  }
  function $(sel, el) { return (el || R).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || R).querySelectorAll(sel)); }
  function byId(id) { return R.getElementById ? R.getElementById(id) : $('[id="' + id + '"]'); }
  function activeEl() { return (R.activeElement !== undefined && R.activeElement) || document.activeElement; }
  /** True if the event comes from el (crosses the Shadow DOM boundary) */
  function inside(e, el) { return e.composedPath ? e.composedPath().indexOf(el) >= 0 : el.contains(e.target); }
  function nodeEl(id) { return $('[data-fx-node="' + id + '"]'); }
  function kids(el) { return Array.prototype.slice.call(el.children); }
  function focusables(el) {
    return $$('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])', el);
  }
  function makeButtonLike(el, label) {
    if (!/^(BUTTON|A|INPUT)$/.test(el.tagName) && !el.querySelector("button,a,input")) {
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
      });
    }
    if (label) el.setAttribute("aria-label", label);
  }

  /** Keyboard shortcut ("mod+k", "mod+shift+p"…); mod = ⌘ on macOS, Ctrl elsewhere */
  function matchesShortcut(e, shortcut) {
    var parts = String(shortcut).toLowerCase().split("+").map(function (p) { return p.trim(); });
    var key = parts.pop();
    var isMac = /mac|iphone|ipad/i.test(navigator.platform);
    var mod = parts.indexOf("mod") >= 0;
    var has = function (p) { return parts.indexOf(p) >= 0; };
    return e.key.toLowerCase() === key &&
      e.ctrlKey === (has("ctrl") || (mod && !isMac)) &&
      e.metaKey === (has("meta") || has("cmd") || (mod && isMac)) &&
      e.altKey === has("alt") && e.shiftKey === has("shift");
  }

  /* ——— Props (same names as the React export) ——— */
  var P = {};
  Object.keys(C.defaults).forEach(function (k) { P[k] = C.defaults[k]; });
  var extraClasses = [];
  var listMarkers = {};

  function coerce(b, v) {
    if (b.kind === "text" && b.list) {
      if (Array.isArray(v)) return v.map(String);
      var s = String(v == null ? "" : v).trim();
      if (s.charAt(0) === "[") { try { return JSON.parse(s).map(String); } catch (err) { /* plain list */ } }
      return s ? s.split("|").map(function (x) { return x.trim(); }).filter(Boolean) : [];
    }
    if (b.kind === "prop" && b.type === "boolean") return v === true || v === "" || v === "true";
    if (b.kind === "prop" && b.type === "number") return Number(v) || 0;
    return v == null ? "" : String(v);
  }

  function segmentText(el, text, n) {
    var by = n.props.by || "word";
    var segs = by === "word" ? text.split(/(\s+)/) : by === "character" ? text.split("") : by === "line" ? text.split("\n") : [text];
    var sample = $("span[aria-hidden]", el);
    var cls = sample ? sample.getAttribute("class") : by === "line" ? "block" : "inline-block whitespace-pre";
    kids(el).forEach(function (k) { if (k.tagName === "SPAN") el.removeChild(k); });
    el.setAttribute("aria-label", text);
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    el.appendChild(sr);
    segs.forEach(function (s) {
      var sp = document.createElement("span");
      sp.className = cls;
      sp.setAttribute("aria-hidden", "true");
      sp.textContent = s;
      el.appendChild(sp);
    });
  }

  /** Writes the value of an exposed text everywhere it is displayed */
  function applyText(id, key) {
    var n = C.nodes[id];
    var v = n.texts[key];
    var tag = id + ":" + key;
    var str = Array.isArray(v) ? v.join(" ") : String(v == null ? "" : v);
    $$('[data-fx-text="' + tag + '"]').forEach(function (el) {
      if (n.brick === "magicui.text-animate") segmentText(el, str, n);
      else el.textContent = str;
    });
    // Lists: the original element is the template, recreated for each value
    var items = $$('[data-fx-item="' + tag + '"]');
    if (!listMarkers[tag]) {
      listMarkers[tag] = [];
      items.forEach(function (it) {
        var p = it.parentNode;
        if (listMarkers[tag].some(function (m) { return m.parentNode === p; })) return;
        var mk = document.createComment("fx-list " + tag);
        mk.__fxTemplate = it.cloneNode(true);
        p.insertBefore(mk, it);
        listMarkers[tag].push(mk);
      });
    }
    if (listMarkers[tag].length) {
      items.forEach(function (it) { it.parentNode.removeChild(it); });
      listMarkers[tag].forEach(function (mk) {
        var after = mk.nextSibling;
        [].concat(v || []).forEach(function (txt) {
          var c = mk.__fxTemplate.cloneNode(true);
          c.textContent = String(txt);
          ["id", "hidden", "data-selected", "aria-selected"].forEach(function (a) { c.removeAttribute(a); });
          mk.parentNode.insertBefore(c, after);
        });
      });
    }
    $$("[data-fx-attrs]").forEach(function (el) {
      el.getAttribute("data-fx-attrs").split(";").forEach(function (pair) {
        var i = pair.indexOf("=");
        if (pair.slice(i + 1) !== tag) return;
        var name = pair.slice(0, i);
        if (name === "heading") { var h = $("[cmdk-group-heading]", el); if (h) h.textContent = str; }
        else if (name === "label") el.setAttribute("aria-label", str);
        else el.setAttribute(name, str);
      });
    });
    $$('[data-fx-if="' + tag + '"]').forEach(function (el) { el.hidden = !str; });
  }

  /** Replaces a node with its pre-rendered variant (variant classes, size, disabled state…) */
  function swapVariant(id) {
    var v = C.variants[id];
    if (!v) return;
    var html = v.html[JSON.stringify(v.props.map(function (p) { return P[p]; }))];
    if (html == null) return;
    $$('[data-fx-node="' + id + '"]').forEach(function (el) {
      var t = document.createElement("template");
      t.innerHTML = html;
      var next = t.content.firstElementChild;
      if (next) el.parentNode.replaceChild(next, el);
    });
    Object.keys(C.props).forEach(function (k) {
      var b = C.props[k];
      if (b.kind === "text" && b.node === id) applyText(id, b.key);
    });
  }

  function applyProp(name) {
    var b = C.props[name], v = P[name];
    if (b.kind === "text") { C.nodes[b.node].texts[b.key] = v; applyText(b.node, b.key); }
    else if (b.kind === "prop") { C.nodes[b.node].props[b.prop] = v; swapVariant(b.node); }
    else if (b.kind === "color") { if (v) root.style.setProperty("--" + b.token, v); else root.style.removeProperty("--" + b.token); }
    else if (b.kind === "scheme") { root.classList.remove("light", "dark", "auto"); if (v === "dark" || v === "auto") root.classList.add(v); }
    else if (b.kind === "class") {
      extraClasses.forEach(function (c) { root.classList.remove(c); });
      extraClasses = String(v || "").split(/\s+/).filter(Boolean);
      extraClasses.forEach(function (c) { root.classList.add(c); });
    }
    if (mounted && b.node && api[b.node] && api[b.node].refresh) api[b.node].refresh();
  }

  function setProps(next) {
    Object.keys(next || {}).forEach(function (k) {
      var b = C.props[k];
      if (!b) { console.warn("[UI Forge] unknown prop: " + k); return; }
      var v = coerce(b, next[k] === undefined ? C.defaults[k] : next[k]);
      // unchanged value: nothing to redo (React wrappers call setProps on every render)
      if (mounted && JSON.stringify(v) === JSON.stringify(P[k])) return;
      P[k] = v;
      applyProp(k);
    });
  }

  /* ——— Click interactions ——— */
  var scope$ = {
    root: root,
    props: P,
    get: function (id) { return api[id] && api[id].get ? api[id].get() : C.nodes[id] && C.nodes[id].open; },
    setter: function (id) {
      return function (v) {
        var t = api[id];
        if (t && t.set) t.set(typeof v === "function" ? v(t.get()) : v);
      };
    },
    input: function (id) { var el = nodeEl(id); return el ? $("[cmdk-input]", el) || $("input", el) : null; }
  };
  function runCustom(id, i) {
    var key = id + ":" + i;
    var fns = null;
    if (CUSTOM && CUSTOM.full) { try { fns = CUSTOM.full(scope$); } catch (err) { fns = null; } }
    if (!fns || !fns[key]) { try { fns = CUSTOM && CUSTOM.base(scope$); } catch (err) { fns = null; } }
    try {
      if (!fns || !fns[key]) throw new Error("action not found");
      fns[key]();
    } catch (err) {
      console.error("[UI Forge] custom action \"" + (CUSTOM && CUSTOM.source[key]) + "\":", err);
    }
  }
  function triggeredBySelf(e, id) {
    var src = e.target.closest && e.target.closest("[data-fx-click]");
    if (!src) return false;
    var n = C.nodes[src.getAttribute("data-fx-click")];
    return !!(n && n.actions && n.actions.some(function (a) { return a.target === id; }));
  }
  function run(id, actions) {
    actions.forEach(function (a, i) {
      var t = a.target && api[a.target];
      if (a.type === "open" && t) t.set(true);
      else if (a.type === "close" && t) t.set(false);
      else if (a.type === "toggle" && t) t.set(!t.get());
      else if (a.type === "setValue" && t) t.set(a.value);
      else if (a.type === "navigate") {
        if (a.newTab) window.open(a.href, "_blank", "noopener"); else window.location.href = a.href;
      } else if (a.type === "custom") runCustom(id, i);
    });
  }
  on(R, "click", function (e) {
    var el = e.target.closest && e.target.closest("[data-fx-click]");
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
    var id = el.getAttribute("data-fx-click");
    var n = C.nodes[id];
    if (n && n.actions) run(id, n.actions);
  });

  /* ——— Windows: dialog, drawer, palette ——— */
  function modal(id, n, kind, panel, trigger) {
    var overlay = document.createElement("div");
    overlay.className = "fx-overlay fx-" + kind;
    overlay.hidden = true;
    var backdrop = document.createElement("div");
    backdrop.className = "fx-backdrop";
    overlay.appendChild(backdrop);
    panel.classList.add("fx-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("tabindex", "-1");
    overlay.appendChild(panel);
    root.appendChild(overlay);
    function refresh() {
      if (kind === "drawer") overlay.setAttribute("data-dir", String(n.props.direction || "bottom"));
      if (n.texts.title) panel.setAttribute("aria-label", String(n.texts.title));
    }
    refresh();
    if (kind === "dialog" && n.props.showCloseButton !== false) {
      var close = document.createElement("button");
      close.type = "button";
      close.className = "fx-close";
      close.setAttribute("aria-label", C.i18n.close);
      close.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      close.addEventListener("click", function () { set(false); });
      panel.appendChild(close);
    }
    var open = false, last = null, timer = 0;
    function set(v) {
      v = !!v;
      if (v === open) return;
      open = v;
      clearTimeout(timer);
      if (open) {
        last = activeEl();
        overlay.hidden = false;
        stack.push(api[id]);
        document.documentElement.style.overflow = "hidden";
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { overlay.classList.add("fx-shown"); });
          var f = focusables(panel).filter(function (x) { return !x.classList.contains("fx-close"); })[0];
          (f || panel).focus();
        });
      } else {
        overlay.classList.remove("fx-shown");
        stack = stack.filter(function (x) { return x !== api[id]; });
        if (!stack.length) document.documentElement.style.overflow = "";
        timer = setTimeout(function () { overlay.hidden = true; }, reduce ? 0 : kind === "drawer" ? 400 : 160);
        if (last && last.focus) last.focus();
      }
    }
    api[id] = { get: function () { return open; }, set: set, refresh: refresh, overlay: overlay };
    var dismissible = function () { return !(kind === "drawer" && n.props.dismissible === false); };
    backdrop.addEventListener("click", function () { if (dismissible()) set(false); });
    if (kind !== "dialog") overlay.addEventListener("click", function (e) { if (e.target === overlay && dismissible()) set(false); });
    if (trigger) {
      $$("[data-fx-open]", trigger).forEach(function (x) { x.removeAttribute("data-fx-open"); });
      trigger.setAttribute("data-fx-trigger", id);
      trigger.addEventListener("click", function (e) { if (!triggeredBySelf(e, id)) set(true); });
    }
    if (n.open) set(true);
    return api[id];
  }
  on(document, "keydown", function (e) {
    if (e.key === "Escape" && stack.length) { e.preventDefault(); stack[stack.length - 1].set(false); }
  });

  /* ——— Filterable list (cmdk) ——— */
  function command(id, n, el, onPick) {
    var input = $("[cmdk-input]", el) || $("input", el);
    var list = $("[cmdk-list]", el) || el;
    var host = list.firstElementChild || list;
    var empty = document.createElement("div");
    empty.className = "py-6 text-center text-sm text-(color:--muted-foreground)";
    empty.hidden = true;
    empty.setAttribute("role", "presentation");
    host.insertBefore(empty, host.firstChild);
    function items() { return $$("[cmdk-item]", el); }
    function visible() { return items().filter(function (i) { return !i.hidden; }); }
    function select(item) {
      items().forEach(function (i) { i.setAttribute("data-selected", String(i === item)); i.setAttribute("aria-selected", String(i === item)); });
      if (item && item.scrollIntoView) item.scrollIntoView({ block: "nearest" });
    }
    function filter() {
      var q = (input && input.value || "").trim().toLowerCase();
      items().forEach(function (i) { i.hidden = q !== "" && i.textContent.toLowerCase().indexOf(q) < 0; });
      $$("[cmdk-group]", el).forEach(function (g) { g.hidden = !$$("[cmdk-item]", g).some(function (i) { return !i.hidden; }); });
      var v = visible();
      empty.textContent = String(n.texts.empty || C.i18n.noResults);
      empty.hidden = v.length > 0;
      select(v[0] || null);
    }
    if (input) {
      input.addEventListener("input", filter);
      input.addEventListener("keydown", function (e) {
        var v = visible();
        var cur = v.findIndex(function (i) { return i.getAttribute("data-selected") === "true"; });
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          var next = e.key === "ArrowDown" ? Math.min(cur + 1, v.length - 1) : Math.max(cur - 1, 0);
          select(v[next] || null);
        } else if (e.key === "Enter" && v[cur]) {
          e.preventDefault();
          v[cur].click();
        }
      });
    }
    list.addEventListener("mousemove", function (e) {
      var it = e.target.closest && e.target.closest("[cmdk-item]");
      if (it && el.contains(it)) select(it);
    });
    list.addEventListener("click", function (e) {
      var it = e.target.closest && e.target.closest("[cmdk-item]");
      if (it && el.contains(it) && onPick) onPick(it);
    });
    filter();
    return { input: input, refresh: filter, reset: function () { if (input) input.value = ""; filter(); } };
  }

  function hotkey(n, fn) {
    on(document, "keydown", function (e) {
      if (n.props.enableShortcut === false) return;
      if (!matchesShortcut(e, n.props.shortcut || "mod+k")) return;
      e.preventDefault();
      fn();
    });
  }

  /* ——— Floating elements: popover, tooltip ——— */
  function place(float, side, offset) {
    var s = float.style;
    s.top = s.bottom = s.left = s.right = s.transform = "";
    if (side === "top") { s.bottom = "calc(100% + " + offset + "px)"; s.left = "50%"; s.transform = "translateX(-50%)"; }
    else if (side === "left") { s.right = "calc(100% + " + offset + "px)"; s.top = "50%"; s.transform = "translateY(-50%)"; }
    else if (side === "right") { s.left = "calc(100% + " + offset + "px)"; s.top = "50%"; s.transform = "translateY(-50%)"; }
    else { s.top = "calc(100% + " + offset + "px)"; s.left = "50%"; s.transform = "translateX(-50%)"; }
  }
  function floating(id, n, el, trigger, float, hover) {
    el.classList.add("fx-anchor");
    el.style.flexDirection = "column";
    float.classList.add("fx-float");
    float.hidden = true;
    float.setAttribute("role", hover ? "tooltip" : "dialog");
    float.id = float.id || "fx-" + id;
    function refresh() { place(float, String(n.props.side || (hover ? "top" : "bottom")), Number(n.props.sideOffset) || 8); }
    refresh();
    var open = false, timer = 0;
    function set(v) {
      v = !!v;
      if (v === open) return;
      open = v;
      clearTimeout(timer);
      trigger.setAttribute(hover ? "aria-describedby" : "aria-expanded", hover ? (open ? float.id : "") : String(open));
      if (open) { float.hidden = false; requestAnimationFrame(function () { float.classList.add("fx-shown"); }); }
      else { float.classList.remove("fx-shown"); timer = setTimeout(function () { float.hidden = true; }, reduce ? 0 : 130); }
    }
    api[id] = { get: function () { return open; }, set: set, refresh: refresh };
    makeButtonLike(trigger);
    if (hover) {
      ["mouseenter", "focusin"].forEach(function (t) { trigger.addEventListener(t, function () { set(true); }); });
      ["mouseleave", "focusout"].forEach(function (t) { trigger.addEventListener(t, function () { set(false); }); });
    } else {
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("data-fx-trigger", id);
      trigger.addEventListener("click", function (e) { if (!triggeredBySelf(e, id)) set(!open); });
      on(document, "pointerdown", function (e) { if (open && !inside(e, el)) set(false); });
    }
    on(document, "keydown", function (e) { if (e.key === "Escape" && open) set(false); });
    return api[id];
  }

  /* ——— Animated number ——— */
  var FORMATS = {
    "currency-eur": { style: "currency", currency: "EUR", maximumFractionDigits: 0 },
    "currency-usd": { style: "currency", currency: "USD", maximumFractionDigits: 0 },
    percent: { style: "percent", maximumFractionDigits: 1 },
    compact: { notation: "compact", maximumFractionDigits: 1 }
  };
  function number(id, n) {
    var el = $('[data-fx-number="' + id + '"]');
    if (!el) return;
    var value = Number(n.props.value) || 0, shown = value, raf = 0;
    function draw(v) {
      shown = v;
      var fmt;
      try { fmt = new Intl.NumberFormat(String(n.props.locale || "fr-FR"), FORMATS[n.props.format] || undefined); }
      catch (err) { fmt = new Intl.NumberFormat(); }
      el.textContent = String(n.texts.prefix || "") + fmt.format(v) + String(n.texts.suffix || "");
    }
    function to(target) {
      target = Number(target) || 0;
      cancelAnimationFrame(raf);
      var from = value, t0 = performance.now(), d = reduce ? 0 : 900;
      value = target;
      (function step(t) {
        var k = d ? Math.min(1, (t - t0) / d) : 1;
        var e = 1 - Math.pow(1 - k, 3);
        var v = from + (target - from) * e;
        draw(k < 1 && Number.isInteger(target) && Number.isInteger(from) && n.props.format !== "percent" ? Math.round(v) : v);
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    api[id] = { get: function () { return value; }, set: to, refresh: function () { draw(shown); } };
    cleanups.push(function () { cancelAnimationFrame(raf); });
    if (n.props.animateOnMount === true && !reduce) {
      var target = value;
      value = Number(n.props.from) || 0;
      draw(value);
      setTimeout(function () { to(target); }, 250);
    } else draw(value);
  }

  /* ——— Magic UI: rotating words, animated text, animated grid ——— */
  function wordRotate(id, n, el) {
    var target = $("h1", el) || el.firstElementChild || el;
    var i = 0;
    function words() { return [].concat(n.texts.words || []); }
    function show(k) {
      var w = words();
      if (!w.length) { target.textContent = ""; return; }
      i = k % w.length;
      if (reduce || !target.animate) { target.textContent = w[i]; return; }
      var out = target.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(50px)" }], { duration: 250, easing: "ease-out", fill: "forwards" });
      out.onfinish = function () {
        target.textContent = words()[i] || "";
        target.animate([{ opacity: 0, transform: "translateY(-50px)" }, { opacity: 1, transform: "none" }], { duration: 250, easing: "ease-out", fill: "forwards" });
      };
    }
    target.textContent = words()[0] || "";
    var timer = 0;
    function start() {
      clearInterval(timer);
      timer = setInterval(function () { if (words().length > 1) show(i + 1); }, Math.max(800, Number(n.props.duration) || 2500));
    }
    start();
    cleanups.push(function () { clearInterval(timer); });
    api[id] = { refresh: function () { i = 0; target.textContent = words()[0] || ""; start(); } };
  }
  var TEXT_FX = {
    fadeIn: [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }],
    blurInUp: [{ opacity: 0, filter: "blur(10px)", transform: "translateY(20px)" }, { opacity: 1, filter: "blur(0)", transform: "none" }],
    slideUp: [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }],
    scaleUp: [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "none" }]
  };
  function textAnimate(id, n, el) {
    function segs() { return $$("span[aria-hidden]", el); }
    function play() {
      var s = segs();
      if (!s.length || reduce || !el.animate) return;
      var frames = TEXT_FX[n.props.animation] || TEXT_FX.fadeIn;
      var stagger = ((Number(n.props.duration) || 0.6) * 1000) / s.length;
      s.forEach(function (x, k) {
        x.style.opacity = "";
        if (getComputedStyle(x).display === "inline") x.style.display = "inline-block";
        x.animate(frames, { duration: 300, delay: k * stagger, easing: "ease-out", fill: "both" });
      });
    }
    api[id] = { refresh: play };
    if (reduce || !el.animate) return;
    if (!("IntersectionObserver" in window)) { play(); return; }
    segs().forEach(function (x) { x.style.opacity = "0"; });
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      play();
      if (n.props.once !== false) io.disconnect();
    });
    io.observe(el);
    cleanups.push(function () { io.disconnect(); });
  }
  /** Animated grid: squares light up, fade out and move (Magic UI Animated Grid Pattern) */
  function animatedGrid(id, n, el) {
    var svg = $("svg", el);
    var inner = svg && $("svg", svg);
    if (!svg || !inner) return;
    var pat = $("pattern", svg);
    var w = Number(pat && pat.getAttribute("width")) || 40;
    var h = Number(pat && pat.getAttribute("height")) || 40;
    var NS = "http://www.w3.org/2000/svg";
    var rects = [];
    function pos(r) {
      var b = svg.getBoundingClientRect();
      r.setAttribute("x", String(Math.floor((Math.random() * b.width) / w) * w + 1));
      r.setAttribute("y", String(Math.floor((Math.random() * b.height) / h) * h + 1));
    }
    function build() {
      rects.forEach(function (r) { r.__fxStop = true; if (r.__fxAnim) r.__fxAnim.cancel(); });
      while (inner.firstChild) inner.removeChild(inner.firstChild);
      rects = [];
      var count = Math.max(0, Number(n.props.numSquares) || 30);
      var max = Number(n.props.maxOpacity) || 0.5;
      var dur = (Number(n.props.duration) || 4) * 1000;
      var pause = 500;
      var total = dur * 2 + pause;
      for (var i = 0; i < count; i++) {
        var r = document.createElementNS(NS, "rect");
        r.setAttribute("width", String(w - 1));
        r.setAttribute("height", String(h - 1));
        r.setAttribute("fill", "currentColor");
        r.setAttribute("stroke-width", "0");
        pos(r);
        inner.appendChild(r);
        rects.push(r);
        if (reduce || !r.animate) { r.style.opacity = String(max / 2); continue; }
        r.style.opacity = "0";
        (function cycle(rect, delay) {
          if (rect.__fxStop) return;
          rect.__fxAnim = rect.animate(
            [{ opacity: 0, offset: 0 }, { opacity: max, offset: dur / total }, { opacity: max, offset: (dur + pause) / total }, { opacity: 0, offset: 1 }],
            { duration: total, delay: delay, easing: "ease-in-out" }
          );
          rect.__fxAnim.onfinish = function () { pos(rect); cycle(rect, 0); };
        })(r, i * 100);
      }
    }
    build();
    cleanups.push(function () { rects.forEach(function (r) { r.__fxStop = true; if (r.__fxAnim) r.__fxAnim.cancel(); }); });
    api[id] = { refresh: build };
  }

  /* ——— Initial prop values (attributes, properties, mount(…, props)) ——— */
  setProps(initial || {});

  /* ——— Mount ——— */
  Object.keys(C.nodes).forEach(function (id) {
    var n = C.nodes[id];
    var el = nodeEl(id);
    if (!el && n.brick !== "numberflow.value") return;
    var k = el ? kids(el) : [];
    switch (n.brick) {
      case "shadcn.dialog":
      case "baseui.drawer":
        if (!k.length) return;
        modal(id, n, n.brick === "shadcn.dialog" ? "dialog" : "drawer", k[k.length - 1], k.length > 1 ? k[0] : null);
        break;
      case "cmdk.dialog": {
        if (!k.length) return;
        var wasOpen = n.open;
        n.open = false;
        var pal = modal(id, n, "palette", k[k.length - 1], null);
        var cmd = command(id, n, k[k.length - 1], function () { pal.set(false); });
        var set = pal.set, refresh = pal.refresh;
        pal.set = function (v) { if (v) cmd.reset(); set(v); };
        pal.refresh = function () { refresh(); cmd.refresh(); };
        hotkey(n, function () { pal.set(!pal.get()); });
        if (wasOpen) pal.set(true);
        break;
      }
      case "cmdk.menu": {
        var menu = command(id, n, el, null);
        api[id] = { refresh: menu.refresh };
        hotkey(n, function () { if (menu.input) menu.input.focus(); });
        break;
      }
      case "radix.collapsible": {
        var trig = $("button", el);
        var content = trig && trig.getAttribute("aria-controls") ? byId(trig.getAttribute("aria-controls")) : k[k.length - 1];
        if (!trig || !content) return;
        var open = !!n.open;
        var apply = function () {
          var st = open ? "open" : "closed";
          [el, trig, content].forEach(function (x) { x.setAttribute("data-state", st); });
          trig.setAttribute("aria-expanded", String(open));
          content.hidden = !open;
        };
        api[id] = { get: function () { return open; }, set: function (v) { open = !!v; apply(); } };
        trig.addEventListener("click", function (e) { if (!triggeredBySelf(e, id)) { open = !open; apply(); } });
        apply();
        break;
      }
      case "baseui.popover":
        if (k.length < 2) return;
        floating(id, n, el, k[0], k[1], false).set(!!n.open);
        break;
      case "baseui.tooltip":
        if (k.length < 2) return;
        floating(id, n, el, k[1], k[0], true);
        break;
      case "numberflow.value":
        number(id, n);
        break;
      case "magicui.word-rotate":
        wordRotate(id, n, el);
        break;
      case "magicui.text-animate":
        textAnimate(id, n, el);
        break;
      case "magicui.animated-grid":
        animatedGrid(id, n, el);
        break;
    }
  });
  mounted = true;

  root.setAttribute("data-fx-ready", "");

  /* ——— Instance API (exposed by the element) ——— */
  return {
    setProps: setProps,
    getProps: function () { var o = {}; Object.keys(P).forEach(function (k) { o[k] = P[k]; }); return o; },
    open: function (id) { if (api[id] && api[id].set) api[id].set(true); },
    close: function (id) { if (api[id] && api[id].set) api[id].set(false); },
    toggle: function (id) { if (api[id] && api[id].set) api[id].set(!api[id].get()); },
    states: function () { return Object.keys(api).filter(function (id) { return api[id].get && C.nodes[id] && C.nodes[id].open !== undefined; }); },
    root: root,
    destroy: function () {
      if (stack.length) document.documentElement.style.overflow = "";
      cleanups.splice(0).forEach(function (fn) { try { fn(); } catch (err) { /* already removed */ } });
    }
  };
}
`;

/**
 * Élément personnalisé et points d'entrée (mount, define). Déclarés dans la fonction englobante qui contient
 * CONFIG, CSS, PROPERTY_CSS, HTML, TAG, CUSTOM et createRuntime. Ne touche au DOM que si `window` existe :
 * le module peut être importé côté serveur (Next.js, SSR) sans erreur.
 */
export const ELEMENT_JS = String.raw`var hasDom = typeof window !== "undefined" && typeof document !== "undefined";
var PROPS = Object.keys(CONFIG.props);
var NATIVE_ATTRS = __NATIVE_ATTRS__;

function attrName(p) { return p.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }); }
/** HTML attribute → prop: cta-label, data-cta-label and ctalabel (attribute set before definition) */
var ATTRS = {};
PROPS.forEach(function (p) {
  if (p === "className") return;
  ATTRS["data-" + attrName(p)] = p;
  // global HTML attributes (title, id, hidden…): only data-title, to keep their native role
  if (NATIVE_ATTRS.indexOf(attrName(p)) >= 0) return;
  ATTRS[attrName(p)] = p;
  ATTRS[p.toLowerCase()] = p;
});

function assign(target, src) {
  if (src) Object.keys(src).forEach(function (k) { target[k] = src[k]; });
  return target;
}
function cloneConfig() {
  return assign(assign({}, CONFIG), { nodes: JSON.parse(JSON.stringify(CONFIG.nodes)) });
}

var sheet = null;
function addStyles(shadow) {
  try {
    if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); }
    shadow.adoptedStyleSheets = [sheet];
    return;
  } catch (err) { /* browser without constructable stylesheets */ }
  var s = document.createElement("style");
  s.textContent = CSS;
  shadow.appendChild(s);
}
/** @property rules (Tailwind variables) only apply at the document level */
function addDocumentStyles() {
  if (!PROPERTY_CSS || document.querySelector('style[data-uiforge="' + TAG + '"]')) return;
  var s = document.createElement("style");
  s.setAttribute("data-uiforge", TAG);
  s.textContent = PROPERTY_CSS;
  (document.head || document.documentElement).appendChild(s);
}

function makeElement() {
  var El = class extends HTMLElement {
    static get observedAttributes() { return Object.keys(ATTRS); }
    constructor() {
      super();
      this._props = {};
      this._rt = null;
    }
    connectedCallback() {
      var self = this;
      // properties set before the element was defined (React, frameworks): taken as props
      PROPS.forEach(function (p) {
        if (Object.prototype.hasOwnProperty.call(self, p)) { var v = self[p]; delete self[p]; self._props[p] = v; }
      });
      if (this._rt) return;
      var shadow = this.shadowRoot || this.attachShadow({ mode: "open" });
      shadow.innerHTML = HTML;
      addStyles(shadow);
      addDocumentStyles();
      var initial = {};
      var g = window.UIForgeProps && window.UIForgeProps[CONFIG.name];
      assign(initial, g);
      for (var i = 0; i < this.attributes.length; i++) {
        var a = this.attributes[i];
        if (ATTRS[a.name]) initial[ATTRS[a.name]] = a.value;
      }
      assign(initial, this._props);
      this._rt = createRuntime(cloneConfig(), shadow, initial);
      this.dispatchEvent(new CustomEvent("uiforge:ready", { bubbles: true, composed: true }));
    }
    disconnectedCallback() {
      if (!this._rt) return;
      this._props = this._rt.getProps();
      this._rt.destroy();
      this._rt = null;
    }
    attributeChangedCallback(name, old, value) {
      var o = {};
      o[ATTRS[name]] = value === null ? undefined : value;
      this.setProps(o);
    }
    /** Changes one or more props, e.g. el.setProps({ ctaLabel: "Try it" }) */
    setProps(next) {
      assign(this._props, next);
      if (this._rt) this._rt.setProps(next);
      return this;
    }
    getProps() { return this._rt ? this._rt.getProps() : assign(assign({}, CONFIG.defaults), this._props); }
    /** Opens / closes a stateful element (dialog, drawer, palette, popover, collapsible) by its id */
    open(id) { if (this._rt) this._rt.open(id); }
    close(id) { if (this._rt) this._rt.close(id); }
    toggle(id) { if (this._rt) this._rt.toggle(id); }
    /** Ids of the stateful elements controllable by open / close / toggle */
    get states() { return this._rt ? this._rt.states() : []; }
    /** Removes the component from the page */
    destroy() { if (this.parentNode) this.parentNode.removeChild(this); }
  };
  // Every prop is also a property: el.ctaLabel = "…" (used by React 19, Vue, Svelte, Angular)
  PROPS.forEach(function (p) {
    if (p in HTMLElement.prototype) return; // className, title…: native properties kept
    Object.defineProperty(El.prototype, p, {
      configurable: true,
      get: function () { return this.getProps()[p]; },
      set: function (v) { var o = {}; o[p] = v; this.setProps(o); }
    });
  });
  return El;
}

/** Declares the custom element (called automatically on load in a browser) */
function define(tag) {
  tag = tag || TAG;
  if (!hasDom || !window.customElements) return null;
  var existing = window.customElements.get(tag);
  if (existing) return existing;
  var El = makeElement();
  window.customElements.define(tag, El);
  return El;
}

/**
 * Inserts an instance into target (element or CSS selector) and returns it.
 * mount("#app", { ctaLabel: "Try it" }) → element with setProps, getProps, open, close, toggle, destroy
 */
function mount(target, props) {
  if (!hasDom) throw new Error("[UI Forge] mount() must be called in a browser");
  define();
  var host = typeof target === "string" ? document.querySelector(target) : target;
  if (!host) throw new Error("[UI Forge] mount: target not found (" + target + ")");
  var el = document.createElement(TAG);
  if (props) el.setProps(props);
  host.appendChild(el);
  return el;
}

if (hasDom) define();

var api = { name: CONFIG.name, tagName: TAG, props: PROPS.slice(), defaults: assign({}, CONFIG.defaults), define: define, mount: mount };
`;

export type VanillaSnapshot = { html: string; tailwindCss: string; variants?: Record<string, NodeVariants> };

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Nom de l'attribut data-* d'une prop (ctaLabel → data-cta-label) */
export function dataAttrName(prop: string) {
  return `data-${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

function mdCell(s: string) {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function vanillaNotices(doc: ComponentDoc, vendored: string[]): string {
  const parties = thirdPartiesOf(doc, vendored);
  const lines = [
    tr("# Third-party notices (THIRD_PARTY_NOTICES)"),
    "",
    tr("The {name} component (JavaScript files of this folder, component styles) was generated by UI Forge and belongs to its author.", { name: doc.name }),
    tr("The elements below come from third-party libraries and remain subject to their original license."),
    "",
    "## Tailwind CSS — MIT",
    "",
    "- Copyright (c) Tailwind Labs, Inc.",
    `- ${tr("Source:")} https://github.com/tailwindlabs/tailwindcss`,
    `- ${tr("Used here:")} ${tr("Preflight reset, default theme variables and utilities compiled into the component's CSS constant")}`,
    "",
  ];
  lines.push("```", mitText("Copyright (c) Tailwind Labs, Inc."), "```", "");
  for (const p of parties) lines.push(`## ${p.name} — ${p.license}`, "", `- ${p.copyright}`, `- ${tr("Source:")} ${tr(p.source)}`, `- ${tr("Used here:")} ${tr(p.usedFor)} (${tr("rendered classes and markup")})`, "", "```", p.text, "```", "");
  return lines.join("\n");
}

/** Attributs globaux du HTML : une prop de même nom passe par data-<nom> sur l'élément */
export const NATIVE_ATTRS = ["accesskey", "autocapitalize", "autofocus", "class", "contenteditable", "dir", "draggable", "enterkeyhint", "hidden", "id", "inert", "inputmode", "is", "lang", "nonce", "part", "popover", "role", "slot", "spellcheck", "style", "tabindex", "title", "translate"];

/** Nom de l'élément personnalisé (il doit contenir un tiret) : PricingCard → pricing-card, Card → ui-card */
export function elementTag(componentName: string) {
  const k = toKebab(componentName) || "mon-composant";
  return /^[a-z][a-z0-9]*-/.test(k) ? k : `ui-${k}`;
}

/** Attribut HTML d'une prop sur l'élément (ctaLabel → cta-label) */
export function propAttrName(prop: string) {
  const a = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return NATIVE_ATTRS.includes(a) ? `data-${a}` : a;
}

/** Règles @property du CSS Tailwind : ignorées dans un Shadow DOM, elles sont déclarées sur le document */
export function propertyRules(css: string) {
  return (css.match(/@property\s+--[\w-]+\s*\{[^}]*\}/g) ?? []).join("\n");
}

type PropRow = { name: string; type: string; comment: string; defaultValue?: string; attr: string | null };

function propRows(doc: ComponentDoc, config: VanillaConfig): PropRow[] {
  return collectProps(doc)
    .filter((p) => config.props[p.name])
    .map((p) => {
      const b = config.props[p.name];
      const list = b.kind === "text" && b.list;
      return { ...p, type: list ? "string[] | string" : p.type, attr: p.name === "className" ? null : propAttrName(p.name) };
    });
}

export function vanillaReadme(doc: ComponentDoc, folder: string, config: VanillaConfig, tag: string): string {
  const fonts = usesPresetFonts(doc);
  const name = config.name;
  const kebab = toKebab(name) || "my-component";
  const dir = `components/${kebab}`;
  const rows = propRows(doc, config)
    .map((p) => `| \`${p.name}\` | ${p.attr ? `\`${p.attr}\`` : "—"} | \`${mdCell(p.type)}\` | ${p.defaultValue ? `\`${mdCell(p.defaultValue)}\`` : "—"} | ${mdCell(p.comment)} |`)
    .join("\n");
  const firstText = propRows(doc, config).find((p) => config.props[p.name]?.kind === "text" && p.type === "string");
  const yourText = tr("Your text");
  const attrEx = firstText ? ` ${firstText.attr}="${yourText}"` : ` color-scheme="dark"`;
  const objEx = firstText ? `{ ${firstText.name}: "${yourText}" }` : `{ colorScheme: "dark" }`;
  const jsxEx = firstText ? ` ${firstText.name}="${yourText}"` : ` colorScheme="dark"`;
  const custom = Object.values(doc.nodes).some((n) => n.interactions.some((i) => i.action.type === "custom"));
  const stateIds = Object.entries(config.nodes)
    .filter(([, n]) => n.open !== undefined)
    .map(([id]) => `\`${id}\``);
  return `# ${name} — ${tr("JavaScript component")}

${tr("Self-contained component exported from UI Forge: **no dependency, no build, no configuration**.")}
${tr("It is a custom HTML element (`<{tag}>`, Web Component): it works in a plain HTML page,", { tag })}
${tr("with any bundler (Vite, webpack, Parcel, esbuild…), in React (Next.js, Vite, Remix…) and in")}
${tr("other frameworks (Vue, Svelte, Angular, Astro…).")}

${tr("Its styles are isolated (Shadow DOM): it does not change your page and your CSS does not break it.")}
${tr("You can display several of them, each with its own props.")}

${tr("## Install")}

${tr("Copy this folder into your project, for example into `{dir}/`. That's all.", { dir })}

| ${tr("File")} | ${tr("Role")} |
| --- | --- |
| \`index.js\` | ${tr("ES module (`import`): markup, styles and behavior of the component")} |
| \`${kebab}.umd.js\` | ${tr("the same component for `<script src>`, `require()` and AMD")} |
| \`react.js\` | ${tr("ready-to-use React component (wrapper of the Web Component)")} |
| \`index.d.ts\`, \`react.d.ts\` | ${tr("TypeScript types (props, element, JSX)")} |
| \`package.json\` | ${tr("enables `import … from \"./{dir}\"` and `npm install ./{dir}`", { dir })} |

${tr("## Use")}

${tr("### 1. HTML page (no build, also works with `file://`)")}

\`\`\`html
<script src="${dir}/${kebab}.umd.js"></script>

<${tag}></${tag}>
<${tag}${attrEx}></${tag}>
\`\`\`

${tr("### 2. ES module in the browser")}

\`\`\`html
<div id="app"></div>
<script type="module">
  import ${name} from "./${dir}/index.js";
  const el = ${name}.mount("#app", ${objEx});
</script>
\`\`\`

${tr("### 3. Bundler (Vite, webpack, Parcel…) or TypeScript")}

\`\`\`js
import ${name} from "./${dir}";        // ${tr("or")} "./${dir}/index.js"
// ${tr("or")}: import { mount, tagName } from "./${dir}";

${name}.mount(document.getElementById("app"), ${objEx});
// ${tr("or directly in the HTML:")} <${tag}></${tag}>
\`\`\`

CommonJS: \`const ${name} = require("./${dir}");\`

${tr("### 4. React (Next.js, Vite, Remix…)")}

\`\`\`jsx
import ${name} from "./${dir}/react";

export default function Page() {
  return <${name}${jsxEx} />;
}
\`\`\`

${tr("The file contains `\"use client\"`: it works as is in the Next.js App Router.")}
${tr("No dependency or Tailwind is needed. `ref` gives the element (`ref.current.open(\"…\")`),")}
${tr("`className` and `style` apply to the host element (margins, width, placement).")}

${tr("You can also use the tag directly (React 19): `import \"./{dir}\";` then `<{tag}{attrs} />`.", { dir, tag, attrs: jsxEx })}

${tr("### 5. Vue, Svelte, Angular, Astro…")}

${tr("Import `./{dir}` once, then use `<{tag}>` in your templates.", { dir, tag })}
${tr("(Vue: declare `{tag}` in `compilerOptions.isCustomElement`; Angular: `CUSTOM_ELEMENTS_SCHEMA`.)", { tag })}

${tr("## Props")}

${tr("All optional. Three ways to pass them:")}

1. ${tr("**HTML attributes**: `<{tag}{attrs}></{tag}>` (also `data-…`). Lists accept JSON or `a|b|c`.", { tag, attrs: attrEx })}
   ${tr("A prop named like a native attribute (`title`, `id`, `hidden`…) is passed as `data-title`, `data-id`…")}
2. ${tr("**JavaScript properties**: `el.setProps({obj})` (live update), or `el.propName = …`", { obj: objEx })}
   ${tr("(except for names already taken by HTML elements, such as `title`: then use `setProps`).")}
3. ${tr("**On creation**: `{name}.mount(target, {obj})`, or the JSX props of the React wrapper.", { name, obj: objEx })}

| ${tr("Prop")} | ${tr("HTML attribute")} | ${tr("Type")} | ${tr("Default")} | ${tr("Description")} |
| --- | --- | --- | --- | --- |
${rows}

${tr("## Element API")}

\`\`\`js
const el = document.querySelector("${tag}");   // ${tr("or the value returned by mount()")}
el.setProps(${objEx});
el.getProps();
el.destroy();                                   // ${tr("removes the component")}
\`\`\`
${stateIds.length ? `\n${tr("Stateful elements controllable by their id: {ids} — `el.open(id)`, `el.close(id)`, `el.toggle(id)` (list: `el.states`).", { ids: stateIds.join(", ") })}\n` : ""}
${tr("`uiforge:ready` event emitted when the element is rendered.")}
${tr("The module also exposes `define(tag?)` to declare the element under another name, `tagName`, `props` and `defaults`.")}
${
    custom
      ? `
${tr("## Custom click actions")}

${tr("The code typed in the Code tab is converted to JavaScript (`CUSTOM` object in `index.js`).")}
${tr("It runs in a scope equivalent to the React component's: states (`…Open`, `set…Open`, `…Value`),")}
${tr("field refs (`…InputRef.current`), props and preserved component code (excluding React hooks).")}
${tr("Any error is shown in the console with the original code.")}
`
      : ""
  }
${tr("## Customize")}

- ${tr("Colors: exposed color props, or edit the CSS variables at the top of the `CSS` constant in `index.js` / `*.umd.js`.")}
- ${tr("Dark mode: `colorScheme` prop (`\"dark\"`, or `\"auto\"` to follow the system).")}
- ${tr("Size and placement: style the `{tag}` element from your CSS (it is `display: block`).", { tag })}
${fonts.length ? `\n${tr("## Fonts")}\n\n${tr("This theme uses {fonts} (SIL OFL 1.1), not included: load them in your page", { fonts: fonts.map((f) => f.name).join(" & ") })}\n${tr("(Google Fonts, `next/font` or self-hosting). Otherwise a system fallback font is used.")}\n` : ""}
${tr("Exported folder: `{folder}/`. The generated code belongs to you; see `THIRD_PARTY_NOTICES.md` for third-party elements.", { folder })}
`;
}

function tsDoc(p: PropRow) {
  return `  /** ${p.comment.replace(/\*\//g, "*\\/")}${p.defaultValue ? ` (${tr("default: {value}", { value: p.defaultValue.replace(/\*\//g, "*\\/") })})` : ""} */`;
}

function indexDts(doc: ComponentDoc, config: VanillaConfig, tag: string) {
  const name = config.name;
  const rows = propRows(doc, config);
  return `// ${name} — types of the JavaScript component generated by UI Forge

export interface ${name}Props {
${rows.map((p) => `${tsDoc(p)}\n  ${p.name}?: ${p.type};`).join("\n")}
}

export interface ${name}Methods {
  /** Changes one or more props (live update) */
  setProps(props: ${name}Props): this;
  /** Current values of all props */
  getProps(): ${name}Props;
  /** Opens / closes a stateful element (dialog, drawer, palette, popover, collapsible) by its id */
  open(id: string): void;
  close(id: string): void;
  toggle(id: string): void;
  /** Ids of the stateful elements */
  readonly states: string[];
  /** Removes the component from the page */
  destroy(): void;
}

/** The <${tag}> element: every prop is also a property (el.${rows[0]?.name ?? "colorScheme"} = …) */
export type ${name}Element = HTMLElement & ${name}Methods & Omit<${name}Props, keyof HTMLElement>;

export interface ${name}Module {
  readonly name: ${JSON.stringify(name)};
  readonly tagName: ${JSON.stringify(tag)};
  readonly props: (keyof ${name}Props)[];
  readonly defaults: ${name}Props;
  /** Declares the element (done automatically on import in a browser), optionally under another name */
  define(tag?: string): CustomElementConstructor | null;
  /** Inserts an instance into the target (element or CSS selector) and returns it */
  mount(target: Element | string, props?: ${name}Props): ${name}Element;
}

declare const ${name}: ${name}Module;
export default ${name};
export declare const name: ${name}Module["name"];
export declare const tagName: ${name}Module["tagName"];
export declare const props: ${name}Module["props"];
export declare const defaults: ${name}Module["defaults"];
export declare const define: ${name}Module["define"];
export declare const mount: ${name}Module["mount"];

declare global {
  interface HTMLElementTagNameMap {
    ${JSON.stringify(tag)}: ${name}Element;
  }
}
`;
}

function reactJs(config: VanillaConfig, tag: string) {
  const name = config.name;
  return `"use client";
/* ${name} — React component, wrapper of the Web Component <${tag}> generated by UI Forge.
   No dependency besides React (17+); no JSX: usable without configuration. */
import * as React from "react";
import ${name}Module from "./index.js";

var HOST_PROPS = ["ref", "className", "style", "id", "children", "hidden", "slot"];

/**
 * <${name} ${config.props.colorScheme ? 'colorScheme="dark" ' : ""}/> — same props as the <${tag}> element.
 * className, style and id apply to the host element; ref gives the element (setProps, open, close…).
 */
export default function ${name}(props) {
  var el = React.useRef(null);
  var previous = React.useRef([]);
  var own = {};
  Object.keys(props).forEach(function (k) {
    if (HOST_PROPS.indexOf(k) < 0) own[k] = props[k];
  });

  React.useLayoutEffect(function () {
    ${name}Module.define();
  }, []);
  // Applies the props on every render: unchanged values are ignored by the element
  React.useLayoutEffect(function () {
    var node = el.current;
    if (!node || !node.setProps) return;
    var next = Object.assign({}, own);
    previous.current.forEach(function (k) {
      if (!(k in next)) next[k] = undefined; // removed prop: default value
    });
    previous.current = Object.keys(own);
    node.setProps(next);
  });
  React.useImperativeHandle(props.ref, function () { return el.current; }, []);

  return React.createElement(${name}Module.tagName, {
    ref: el,
    className: props.className,
    style: props.style,
    id: props.id,
    hidden: props.hidden,
    slot: props.slot,
    suppressHydrationWarning: true,
  });
}

export { ${name} };
`;
}

function reactDts(config: VanillaConfig, tag: string) {
  const name = config.name;
  return `import type * as React from "react";
import type { ${name}Element, ${name}Props } from "./index";

export type { ${name}Element, ${name}Props };

export type ${name}ReactProps = Omit<${name}Props, "className"> & {
  /** Classes of the host element (margins, width, placement) */
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  hidden?: boolean;
  slot?: string;
  ref?: React.Ref<${name}Element>;
};

declare function ${name}(props: ${name}ReactProps): React.ReactElement;
export default ${name};
export { ${name} };

/* La balise <${tag}> est aussi utilisable directement en JSX (React 19) */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      ${JSON.stringify(tag)}: Omit<React.HTMLAttributes<${name}Element>, keyof ${name}Props> & Partial<${name}Props> & { ref?: React.Ref<${name}Element> };
    }
  }
}
`;
}

export function buildVanillaFiles(doc: ComponentDoc, snap: VanillaSnapshot) {
  const gen = generateTsx(doc);
  const kebab = toKebab(gen.componentName) || "my-component";
  const folder = `${toKebab(doc.name) || "my-component"}-js`;
  const dir = `components/${kebab}`;
  const tag = elementTag(gen.componentName);
  const scheme = doc.theme.defaultScheme;
  const fonts = usesPresetFonts(doc);
  const fontLink = fonts.length
    ? `\n    <!-- ${tr("Theme fonts (SIL OFL 1.1): uncomment to load them from Google Fonts")}\n    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.name.replace(/ /g, "+")}:wght@400;500;600;700`).join("&")}&display=swap">\n    -->`
    : "";
  const config = vanillaConfig(doc, snap.variants);
  const css = [
    `/* ${doc.name} — component styles (isolated in its Shadow DOM) */`,
    `:host { display: block; }\n:host([hidden]) { display: none; }`,
    generateCss(doc, { breakpoints: "media" }),
    RUNTIME_CSS,
    `/* ——— Tailwind CSS (MIT, Tailwind Labs): theme, preflight and used utilities ——— */\n${snap.tailwindCss}`,
  ].join("\n\n");
  const body = [
    `"use strict";`,
    `var CONFIG = ${JSON.stringify(config, null, 2)};`,
    `var TAG = ${JSON.stringify(tag)};`,
    `var HTML = ${JSON.stringify(snap.html.trim())};`,
    `var CSS = ${JSON.stringify(css)};`,
    `var PROPERTY_CSS = ${JSON.stringify(propertyRules(snap.tailwindCss))};`,
    ``,
    customActionsJs(doc, Object.keys(config.props)),
    ``,
    RUNTIME_JS,
    ELEMENT_JS.replace("__NATIVE_ATTRS__", JSON.stringify(NATIVE_ATTRS)),
    `return api;`,
  ].join("\n");
  const header = `/* ${config.name} — JavaScript component (Web Component <${tag}>) generated by UI Forge, no dependency */`;
  const esm = [
    header,
    `/* ES module: import ${config.name} from "./${dir}/index.js" — see README.md */`,
    `var api = (function () {`,
    body,
    `})();`,
    ``,
    `export var name = api.name;`,
    `export var tagName = api.tagName;`,
    `export var props = api.props;`,
    `export var defaults = api.defaults;`,
    `export var define = api.define;`,
    `export var mount = api.mount;`,
    `export default api;`,
    ``,
  ].join("\n");
  const umd = [
    header,
    `/* Classic script, CommonJS or AMD: <script src="${kebab}.umd.js"></script> → window.UIForge.${config.name} */`,
    `(function (global, factory) {`,
    `  var api = factory();`,
    `  api["default"] = api;`,
    `  if (typeof module === "object" && module && module.exports) module.exports = api;`,
    `  else if (typeof define === "function" && define.amd) define([], function () { return api; });`,
    `  if (global) { global.UIForge = global.UIForge || {}; global.UIForge[api.name] = api; }`,
    `})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {`,
    body,
    `});`,
    ``,
  ].join("\n");
  const pkg = {
    name: kebab,
    version: "1.0.0",
    private: true,
    description: `${config.name} — JavaScript component (Web Component <${tag}>) exported from UI Forge`,
    main: `${kebab}.umd.js`,
    module: "index.js",
    browser: "index.js",
    types: "index.d.ts",
    unpkg: `${kebab}.umd.js`,
    sideEffects: true,
    peerDependencies: { react: ">=17" },
    peerDependenciesMeta: { react: { optional: true } },
  };
  const firstText = propRows(doc, config).find((p) => config.props[p.name]?.kind === "text" && p.type === "string");
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(doc.name)}</title>${fontLink}
    <style>
      html, body { margin: 0; min-height: 100%; }
      body { background: ${doc.theme.color[scheme].background}; }
    </style>
  </head>
  <body>
    <!-- ${tr("The component comes from {dir}/: copy this folder into your project (see its README.md)", { dir })} -->
    <${tag}></${tag}>

    <!-- ${tr("Another instance, with props:")}
    <${tag}${firstText ? ` ${firstText.attr}="${tr("Your text")}"` : ` color-scheme="dark"`}></${tag}>
    -->

    <script src="${dir}/${kebab}.umd.js"></script>
    <!-- ${tr("Or as an ES module:")}
    <script type="module">
      import ${config.name} from "./${dir}/index.js";
      ${config.name}.mount(document.body, ${firstText ? `{ ${firstText.name}: "${tr("Your text")}" }` : `{ colorScheme: "dark" }`});
    </script>
    -->
  </body>
</html>
`;
  const readmeText = vanillaReadme(doc, folder, config, tag);
  const files: Record<string, string> = {
    "index.html": html,
    "README.md": `# ${config.name}\n\n${tr("Open `index.html` to see the component.")}\n\n${tr("The component is in `{dir}/`: copy this folder into your project and import it", { dir })}\n${tr("(HTML, ES module, bundler, CommonJS or React). Full guide: [{dir}/README.md](./{dir}/README.md).", { dir })}\n`,
    [`${dir}/index.js`]: esm,
    [`${dir}/${kebab}.umd.js`]: umd,
    [`${dir}/react.js`]: reactJs(config, tag),
    [`${dir}/index.d.ts`]: indexDts(doc, config, tag),
    [`${dir}/react.d.ts`]: reactDts(config, tag),
    [`${dir}/package.json`]: `${JSON.stringify(pkg, null, 2)}\n`,
    [`${dir}/README.md`]: readmeText,
    [`${dir}/THIRD_PARTY_NOTICES.md`]: vanillaNotices(doc, collectVendored(gen.vendored).files),
  };
  return { folder, dir, tag, files };
}
