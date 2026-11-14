/**
 * Format « spec » pour agents IA et liens de création (/new?spec=…).
 *
 * Le modèle complet (ComponentDoc) est la source de vérité du studio mais il est verbeux (ids, slots,
 * valeurs de style imbriquées). La spec décrit le même composant sous forme d'arbre de briques :
 *
 *   { "format": "ui-forge/spec@1", "name": "PricingCard",
 *     "children": [{ "brick": "shadcn.card", "texts": { "title": "Pro" },
 *                    "style": { "maxWidth": "22rem", "shadow": "shadow.md" },
 *                    "children": [{ "brick": "shadcn.button", "texts": { "label": "Start" } }] }] }
 *
 * specToDoc() valide tout (briques, props, textes, slots, tokens, cibles d'interactions) et renvoie des
 * diagnostics précis (chemin JSON) ; docToSpec() fait l'inverse (exemples de la documentation, tests).
 * Module pur : utilisable dans le navigateur, les routes API et les tests.
 */
import { findBrick } from "../bricks/registry";
import type { BrickDefinition, PropField } from "../bricks/types";
import { canDrop, createEmptyDoc, createNode, insertNode, normalizeDoc, toIdentifier, toPascal, usedPropNames, walk } from "../model/ops";
import {
  ANIMATION_PRESETS,
  BREAKPOINTS,
  STYLE_KEYS,
  STYLE_STATES,
  type AnimationSpec,
  type ComponentDoc,
  type Diagnostic,
  type InteractionAction,
  type Node,
  type PropValue,
  type StyleDecl,
  type StyleKey,
  type StyleSpec,
  type StyleValue,
} from "../model/types";
import { COLOR_TOKENS, defaultTheme, STYLE_TOKEN_GROUP, tokensOfGroup } from "../tokens/theme";
import { BEAUTIFUL_UI_REF, BEAUTIFUL_UI_THEME } from "../tokens/beautiful-ui";

export const SPEC_FORMAT = "ui-forge/spec@1";

/** Valeur de style : un token du thème ("color.primary", "space.4"…) ou une valeur CSS ("22rem", "#2563eb") */
export type SpecStyleValue = string;
export type SpecStyleDecl = Partial<Record<StyleKey, SpecStyleValue>>;
/** Raccourci : un objet de déclarations = styles de base ; sinon { base, hover, md… } */
export type SpecStyle = SpecStyleDecl | ({ base?: SpecStyleDecl } & Partial<Record<(typeof STYLE_STATES)[number] | (typeof BREAKPOINTS)[number], SpecStyleDecl>>);

export type SpecAction =
  | { action: "open" | "close" | "toggle"; target: string }
  | { action: "setValue"; target: string; value: number }
  | { action: "navigate"; href: string; newTab?: boolean };

export type SpecAnimation = AnimationSpec["preset"] | (Partial<Omit<AnimationSpec, "origin">> & { preset: AnimationSpec["preset"] });

export type SpecNode = {
  brick: string;
  /** Identifiant local pour cibler ce nœud depuis onClick (ex. "cartDrawer") */
  ref?: string;
  name?: string;
  props?: Record<string, PropValue>;
  /** Textes affichés ; une liste pour les champs de type liste */
  texts?: Record<string, string | string[]>;
  /** Nom de prop exportée pour un texte, ou false pour ne pas l'exposer */
  textProps?: Record<string, string | false>;
  /** Props de la brique exposées comme props du composant : { variant: "ctaVariant" } */
  exposeProps?: Record<string, string>;
  style?: SpecStyle;
  animation?: SpecAnimation;
  /** Classes Tailwind supplémentaires */
  className?: string;
  /** Enfants du slot principal ("children", sinon "content") */
  children?: SpecNode[];
  /** Enfants par slot nommé (ex. Dialog : { trigger: […], content: […] }) */
  slots?: Record<string, SpecNode[]>;
  onClick?: SpecAction[];
};

export type SpecTheme = {
  preset?: "default" | "beautiful-ui";
  defaultScheme?: "light" | "dark";
  /** Rayon de base, ex. "0.75rem" */
  radius?: string;
  colors?: { light?: Record<string, string>; dark?: Record<string, string> };
  fonts?: { sans?: string; heading?: string; mono?: string };
  /** Couleurs exposées comme props : { primary: "brandColor" } */
  exposeColors?: Record<string, string>;
};

export type ComponentSpec = {
  format?: typeof SPEC_FORMAT;
  name: string;
  theme?: SpecTheme;
  /** Conteneur racine (brique layout.stack) */
  root?: Pick<SpecNode, "props" | "style" | "animation" | "className">;
  children?: SpecNode[];
};

const IDENT = /^[A-Za-z_$][\w$]*$/;
const TOKEN = /^(color|radius|space|shadow|font|text)\.[\w-]+$/;
const ROOT_BRICK = "layout.stack";

/** Slot principal d'une brique (cible de `children`) */
export function defaultSlot(b: BrickDefinition): string | null {
  const slots = Object.keys(b.slots ?? {});
  return slots.includes("children") ? "children" : slots.includes("content") ? "content" : null;
}

export function isComponentDoc(raw: unknown): raw is ComponentDoc {
  return !!raw && typeof raw === "object" && "nodes" in raw && "rootId" in raw;
}

type Ctx = { doc: ComponentDoc; errors: Diagnostic[]; refs: Map<string, Node>; pending: { node: Node; actions: SpecAction[]; path: string }[] };

const err = (ctx: Ctx, path: string, message: string): void => void ctx.errors.push({ severity: "error", message: path ? `${path}: ${message}` : message });
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function checkProp(ctx: Ctx, path: string, key: string, f: PropField, v: unknown): PropValue | undefined {
  if (f.type === "enum") {
    if (typeof v !== "string" || !f.options.some((o) => o.value === v)) return void err(ctx, path, `"${String(v)}" is not valid for ${key} (${f.options.map((o) => o.value).join(", ")})`);
    return v;
  }
  if (f.type === "boolean") return typeof v === "boolean" ? v : void err(ctx, path, `${key} must be a boolean`);
  if (f.type === "number") {
    if (typeof v !== "number" || !Number.isFinite(v)) return void err(ctx, path, `${key} must be a number`);
    if (v < f.min || v > f.max) return void err(ctx, path, `${key} must be between ${f.min} and ${f.max}`);
    return v;
  }
  return typeof v === "string" ? v : void err(ctx, path, `${key} must be a string`);
}

function styleValue(ctx: Ctx, path: string, key: StyleKey, v: unknown): StyleValue | undefined {
  if (typeof v !== "string" || !v.trim()) return void err(ctx, path, `style value of ${key} must be a non-empty string`);
  const group = STYLE_TOKEN_GROUP[key];
  if (TOKEN.test(v)) {
    if (!group || !tokensOfGroup(ctx.doc.theme, group).some(([t]) => t === v)) {
      const valid = group ? tokensOfGroup(ctx.doc.theme, group).map(([t]) => t).join(", ") : "none (use a CSS value)";
      return void err(ctx, path, `unknown token "${v}" for ${key} (valid: ${valid})`);
    }
    return { token: v };
  }
  return { value: v.trim() };
}

function styleDecl(ctx: Ctx, path: string, b: BrickDefinition | null, raw: unknown): StyleDecl {
  const out: StyleDecl = {};
  if (!isObj(raw)) return err(ctx, path, "must be an object"), out;
  for (const [k, v] of Object.entries(raw)) {
    if (!(STYLE_KEYS as readonly string[]).includes(k)) {
      err(ctx, `${path}.${k}`, `unknown style key (valid: ${STYLE_KEYS.join(", ")}; layers: base, hover, focus, active, disabled, sm, md, lg, xl)`);
      continue;
    }
    if (b && !b.styleTargets.includes(k as StyleKey)) {
      err(ctx, `${path}.${k}`, `not supported by ${b.id} (supported: ${b.styleTargets.join(", ") || "none"})`);
      continue;
    }
    const sv = styleValue(ctx, `${path}.${k}`, k as StyleKey, v);
    if (sv) out[k as StyleKey] = sv;
  }
  return out;
}

function applyStyle(ctx: Ctx, path: string, node: Node, b: BrickDefinition, raw: unknown) {
  if (!isObj(raw)) return err(ctx, path, "must be an object");
  const layers = ["base", ...STYLE_STATES, ...BREAKPOINTS];
  const spec: StyleSpec = { ...node.style, base: { ...node.style.base } };
  // clés de style directes = styles de base ; base / hover / md… = couches
  const direct = Object.fromEntries(Object.entries(raw).filter(([k]) => !layers.includes(k)));
  if (Object.keys(direct).length) Object.assign(spec.base, styleDecl(ctx, path, b, direct));
  for (const [layer, decl] of Object.entries(raw)) {
      if (!layers.includes(layer)) continue;
      if (layer !== "base" && STYLE_STATES.includes(layer as never) && !b.states.includes(layer as never)) {
        err(ctx, `${path}.${layer}`, `state not supported by ${b.id} (supported: ${b.states.join(", ") || "none"})`);
        continue;
      }
      const d = styleDecl(ctx, `${path}.${layer}`, b, decl);
      if (layer === "base") Object.assign(spec.base, d);
      else (spec as Record<string, StyleDecl>)[layer] = d;
    }
  node.style = spec;
}

function animation(ctx: Ctx, path: string, raw: unknown): AnimationSpec | undefined {
  const base: AnimationSpec = { preset: "fade-up", on: "mount", durationMs: 450, delayMs: 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)", reducedMotion: "fade-only" };
  const a = typeof raw === "string" ? { preset: raw } : raw;
  if (!isObj(a)) return void err(ctx, path, "must be a preset name or an object");
  const out = { ...base, ...a } as AnimationSpec;
  if (!(ANIMATION_PRESETS as readonly string[]).includes(out.preset)) return void err(ctx, `${path}.preset`, `unknown preset (valid: ${ANIMATION_PRESETS.join(", ")})`);
  if (!["mount", "hover", "in-view"].includes(out.on)) return void err(ctx, `${path}.on`, "must be mount, hover or in-view");
  if (typeof out.durationMs !== "number" || typeof out.delayMs !== "number") return void err(ctx, path, "durationMs and delayMs must be numbers");
  if (!["disable", "fade-only"].includes(out.reducedMotion)) return void err(ctx, `${path}.reducedMotion`, "must be disable or fade-only");
  return out.preset === "none" ? undefined : out;
}

function propName(ctx: Ctx, path: string, name: unknown, except?: { nodeId: string; key: string }): string | undefined {
  if (typeof name !== "string" || !IDENT.test(name)) return void err(ctx, path, `"${String(name)}" is not a valid JavaScript identifier`);
  if (usedPropNames(ctx.doc, except).has(name)) return void err(ctx, path, `prop name "${name}" is already used`);
  return name;
}

const NODE_KEYS = new Set(["brick", "ref", "name", "props", "texts", "textProps", "exposeProps", "style", "animation", "className", "children", "slots", "onClick"]);

function buildNode(ctx: Ctx, path: string, raw: unknown, parentId: string, slot: string): void {
  if (!isObj(raw)) return err(ctx, path, "must be an object");
  for (const k of Object.keys(raw)) if (!NODE_KEYS.has(k)) err(ctx, `${path}.${k}`, `unknown field (valid: ${[...NODE_KEYS].join(", ")})`);
  const b = typeof raw.brick === "string" ? findBrick(raw.brick) : undefined;
  if (!b || b.id === "raw.jsx") return err(ctx, `${path}.brick`, `unknown brick "${String(raw.brick)}" (see /schema.json or /llms.txt)`);
  if (!canDrop(ctx.doc, b.id, parentId, slot)) {
    const pb = findBrick(ctx.doc.nodes[parentId].brick)!;
    const def = pb.slots?.[slot];
    return err(ctx, path, def?.accepts === "inline" ? `slot "${slot}" of ${pb.id} only accepts one simple element (no container or overlay)` : `cannot be placed in slot "${slot}" of ${pb.id}`);
  }
  const node = createNode(ctx.doc, b.id);
  insertNode(ctx.doc, node, parentId, slot, Infinity);
  if (typeof raw.name === "string" && raw.name.trim()) node.name = raw.name.trim();
  if (raw.ref !== undefined) {
    if (typeof raw.ref !== "string" || !raw.ref) err(ctx, `${path}.ref`, "must be a non-empty string");
    else if (ctx.refs.has(raw.ref)) err(ctx, `${path}.ref`, `duplicate ref "${raw.ref}"`);
    else ctx.refs.set(raw.ref, node);
  }
  if (raw.props !== undefined) {
    if (!isObj(raw.props)) err(ctx, `${path}.props`, "must be an object");
    else
      for (const [k, v] of Object.entries(raw.props)) {
        const f = b.props[k];
        if (!f) err(ctx, `${path}.props.${k}`, `unknown prop of ${b.id} (valid: ${Object.keys(b.props).join(", ") || "none"})`);
        else {
          const pv = checkProp(ctx, `${path}.props.${k}`, k, f, v);
          if (pv !== undefined) node.props[k] = pv;
        }
      }
  }
  if (raw.texts !== undefined) {
    if (!isObj(raw.texts)) err(ctx, `${path}.texts`, "must be an object");
    else
      for (const [k, v] of Object.entries(raw.texts)) {
        const tf = b.texts.find((t) => t.key === k);
        if (!tf) err(ctx, `${path}.texts.${k}`, `unknown text of ${b.id} (valid: ${b.texts.map((t) => t.key).join(", ") || "none"})`);
        else if (tf.kind === "list") {
          const list = typeof v === "string" ? [v] : v;
          if (!Array.isArray(list) || !list.every((x) => typeof x === "string")) err(ctx, `${path}.texts.${k}`, "must be an array of strings");
          else node.texts[k].value = list;
        } else if (typeof v !== "string") err(ctx, `${path}.texts.${k}`, "must be a string");
        else node.texts[k].value = v;
      }
  }
  if (raw.textProps !== undefined) {
    if (!isObj(raw.textProps)) err(ctx, `${path}.textProps`, "must be an object");
    else
      for (const [k, v] of Object.entries(raw.textProps)) {
        if (!node.texts[k]) err(ctx, `${path}.textProps.${k}`, `unknown text of ${b.id}`);
        else if (v === false) node.texts[k].expose = false;
        else {
          const n = propName(ctx, `${path}.textProps.${k}`, v, { nodeId: node.id, key: k });
          if (n) node.texts[k].propName = n;
        }
      }
  }
  if (raw.exposeProps !== undefined) {
    if (!isObj(raw.exposeProps)) err(ctx, `${path}.exposeProps`, "must be an object");
    else
      for (const [k, v] of Object.entries(raw.exposeProps)) {
        const f = b.props[k];
        const allowed = (f && "exposable" in f && f.exposable) || b.exposeByDefault?.includes(k);
        if (!allowed) {
          const list = Object.entries(b.props).filter(([, x]) => "exposable" in x && x.exposable).map(([key]) => key);
          err(ctx, `${path}.exposeProps.${k}`, `cannot be exposed (exposable: ${list.join(", ") || "none"})`);
          continue;
        }
        const existing = ctx.doc.exposedProps.find((e) => e.nodeId === node.id && e.prop === k);
        if (existing) existing.propName = "";
        const n = propName(ctx, `${path}.exposeProps.${k}`, v);
        if (!n) continue;
        if (existing) existing.propName = n;
        else ctx.doc.exposedProps.push({ nodeId: node.id, prop: k, propName: n });
      }
  }
  if (raw.style !== undefined) applyStyle(ctx, `${path}.style`, node, b, raw.style);
  if (raw.animation !== undefined) node.animation = animation(ctx, `${path}.animation`, raw.animation);
  if (raw.className !== undefined) {
    if (typeof raw.className !== "string") err(ctx, `${path}.className`, "must be a string");
    else if (raw.className.trim()) node.className = raw.className.trim();
  }
  if (raw.onClick !== undefined) {
    if (!b.clickable) err(ctx, `${path}.onClick`, `${b.id} is not clickable (clickable: shadcn.button, magicui.shimmer-button)`);
    else if (!Array.isArray(raw.onClick)) err(ctx, `${path}.onClick`, "must be an array");
    else ctx.pending.push({ node, actions: raw.onClick as SpecAction[], path: `${path}.onClick` });
  }
  const children: [string, unknown][] = [];
  if (raw.children !== undefined) {
    const s = defaultSlot(b);
    if (!s) err(ctx, `${path}.children`, `${b.id} has no children (slots: ${Object.keys(b.slots ?? {}).join(", ") || "none"})`);
    else children.push([s, raw.children]);
  }
  if (raw.slots !== undefined) {
    if (!isObj(raw.slots)) err(ctx, `${path}.slots`, "must be an object");
    else
      for (const [s, list] of Object.entries(raw.slots)) {
        if (!b.slots?.[s]) err(ctx, `${path}.slots.${s}`, `unknown slot of ${b.id} (valid: ${Object.keys(b.slots ?? {}).join(", ") || "none"})`);
        else children.push([s, list]);
      }
  }
  // ordre de déclaration des slots (déclencheur avant contenu) : ids stables et identiques au studio
  const order = Object.keys(b.slots ?? {});
  children.sort((x, y) => order.indexOf(x[0]) - order.indexOf(y[0]));
  for (const [s, list] of children) {
    const p = list === raw.children ? `${path}.children` : `${path}.slots.${s}`;
    if (!Array.isArray(list)) err(ctx, p, "must be an array");
    else list.forEach((c, i) => buildNode(ctx, `${p}[${i}]`, c, node.id, s));
  }
}

function resolveActions(ctx: Ctx) {
  for (const { node, actions, path } of ctx.pending) {
    actions.forEach((a, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(a)) return err(ctx, p, "must be an object");
      if (a.action === "navigate") {
        if (typeof a.href !== "string" || !a.href) return err(ctx, `${p}.href`, "must be a non-empty string");
        const act: InteractionAction = { type: "navigate", href: a.href };
        if (a.newTab === true) act.newTab = true;
        return void node.interactions.push({ trigger: "click", action: act });
      }
      if (!["open", "close", "toggle", "setValue"].includes(String(a.action))) return err(ctx, `${p}.action`, "must be open, close, toggle, setValue or navigate");
      const target = typeof a.target === "string" ? ctx.refs.get(a.target) : undefined;
      if (!target) return err(ctx, `${p}.target`, `unknown ref "${String(a.target)}" (set "ref" on the target node)`);
      const kind = findBrick(target.brick)?.state?.kind;
      if (a.action === "setValue") {
        if (kind !== "value") return err(ctx, `${p}.target`, `"${String(a.target)}" has no value (use numberflow.value)`);
        if (typeof a.value !== "number") return err(ctx, `${p}.value`, "must be a number");
        return void node.interactions.push({ trigger: "click", action: { type: "setValue", target: target.id, value: a.value } });
      }
      if (kind !== "open") return err(ctx, `${p}.target`, `"${String(a.target)}" cannot be opened (dialog, drawer, popover, collapsible, cmdk.dialog)`);
      node.interactions.push({ trigger: "click", action: { type: a.action as "open" | "close" | "toggle", target: target.id } });
    });
  }
}

function applyTheme(ctx: Ctx, raw: unknown) {
  if (!isObj(raw)) return err(ctx, "theme", "must be an object");
  const t = ctx.doc.theme;
  for (const k of Object.keys(raw)) if (!["preset", "defaultScheme", "radius", "colors", "fonts", "exposeColors"].includes(k)) err(ctx, `theme.${k}`, "unknown field");
  if (raw.preset === "beautiful-ui") {
    t.color.light = { ...BEAUTIFUL_UI_THEME.color.light };
    t.color.dark = { ...BEAUTIFUL_UI_THEME.color.dark };
    t.radius = BEAUTIFUL_UI_THEME.radius;
    t.shadow = { ...BEAUTIFUL_UI_THEME.shadow };
    t.font = { ...BEAUTIFUL_UI_THEME.font };
    t.fontSize = { ...BEAUTIFUL_UI_THEME.fontSize };
    t.preset = { ...BEAUTIFUL_UI_REF };
  } else if (raw.preset !== undefined && raw.preset !== "default") err(ctx, "theme.preset", "must be default or beautiful-ui");
  if (raw.defaultScheme !== undefined) {
    if (raw.defaultScheme !== "light" && raw.defaultScheme !== "dark") err(ctx, "theme.defaultScheme", "must be light or dark");
    else t.defaultScheme = raw.defaultScheme;
  }
  if (raw.radius !== undefined) {
    if (typeof raw.radius !== "string") err(ctx, "theme.radius", "must be a CSS length, e.g. 0.75rem");
    else t.radius = raw.radius;
  }
  if (raw.colors !== undefined) {
    if (!isObj(raw.colors)) err(ctx, "theme.colors", "must be an object { light, dark }");
    else
      for (const [scheme, map] of Object.entries(raw.colors)) {
        if (scheme !== "light" && scheme !== "dark") err(ctx, `theme.colors.${scheme}`, "must be light or dark");
        else if (!isObj(map)) err(ctx, `theme.colors.${scheme}`, "must be an object");
        else
          for (const [c, v] of Object.entries(map)) {
            if (!(COLOR_TOKENS as readonly string[]).includes(c)) err(ctx, `theme.colors.${scheme}.${c}`, `unknown color token (valid: ${COLOR_TOKENS.join(", ")})`);
            else if (typeof v !== "string") err(ctx, `theme.colors.${scheme}.${c}`, "must be a CSS color");
            else t.color[scheme][c] = v;
          }
      }
  }
  if (raw.fonts !== undefined) {
    if (!isObj(raw.fonts)) err(ctx, "theme.fonts", "must be an object");
    else
      for (const [k, v] of Object.entries(raw.fonts)) {
        if (!["sans", "heading", "mono"].includes(k)) err(ctx, `theme.fonts.${k}`, "must be sans, heading or mono");
        else if (typeof v !== "string") err(ctx, `theme.fonts.${k}`, "must be a CSS font stack");
        else t.font[k as "sans"] = v;
      }
  }
  if (raw.exposeColors !== undefined) {
    if (!isObj(raw.exposeColors)) err(ctx, "theme.exposeColors", "must be an object { token: propName }");
    else {
      t.exposed = [];
      for (const [c, n] of Object.entries(raw.exposeColors)) {
        if (!(COLOR_TOKENS as readonly string[]).includes(c)) err(ctx, `theme.exposeColors.${c}`, "unknown color token");
        else {
          const name = propName(ctx, `theme.exposeColors.${c}`, n);
          if (name) t.exposed.push({ token: c, propName: name });
        }
      }
    }
  }
}

/** Spec → modèle complet. doc = null si au moins une erreur (toutes les erreurs sont listées). */
export function specToDoc(raw: unknown): { doc: ComponentDoc | null; diagnostics: Diagnostic[] } {
  if (!isObj(raw)) return { doc: null, diagnostics: [{ severity: "error", message: "The spec must be a JSON object" }] };
  if (raw.format !== undefined && raw.format !== SPEC_FORMAT) return { doc: null, diagnostics: [{ severity: "error", message: `format: expected "${SPEC_FORMAT}"` }] };
  const name = typeof raw.name === "string" ? toPascal(raw.name) : "";
  const doc = createEmptyDoc(name || "MyComponent");
  const ctx: Ctx = { doc, errors: [], refs: new Map(), pending: [] };
  if (!name) err(ctx, "name", "required: the component name in PascalCase, e.g. PricingCard");
  for (const k of Object.keys(raw)) if (!["$schema", "format", "name", "theme", "root", "children"].includes(k)) err(ctx, k, "unknown field (valid: format, name, theme, root, children)");
  if (raw.theme !== undefined) applyTheme(ctx, raw.theme);
  const root = doc.nodes[doc.rootId];
  const rootBrick = findBrick(ROOT_BRICK)!;
  if (raw.root !== undefined) {
    if (!isObj(raw.root)) err(ctx, "root", "must be an object");
    else {
      for (const k of Object.keys(raw.root)) if (!["props", "style", "animation", "className"].includes(k)) err(ctx, `root.${k}`, "unknown field (valid: props, style, animation, className)");
      if (isObj(raw.root.props))
        for (const [k, v] of Object.entries(raw.root.props)) {
          const f = rootBrick.props[k];
          if (!f) err(ctx, `root.props.${k}`, `unknown prop (valid: ${Object.keys(rootBrick.props).join(", ")})`);
          else {
            const pv = checkProp(ctx, `root.props.${k}`, k, f, v);
            if (pv !== undefined) root.props[k] = pv;
          }
        }
      if (raw.root.style !== undefined) applyStyle(ctx, "root.style", root, rootBrick, raw.root.style);
      if (raw.root.animation !== undefined) root.animation = animation(ctx, "root.animation", raw.root.animation);
      if (typeof raw.root.className === "string" && raw.root.className.trim()) root.className = raw.root.className.trim();
    }
  }
  if (raw.children !== undefined) {
    if (!Array.isArray(raw.children)) err(ctx, "children", "must be an array of nodes");
    else raw.children.forEach((c, i) => buildNode(ctx, `children[${i}]`, c, root.id, "children"));
  }
  resolveActions(ctx);
  if (ctx.errors.length) return { doc: null, diagnostics: ctx.errors };
  normalizeDoc(doc);
  return { doc, diagnostics: [] };
}

/* ——— Modèle → spec (exemples de documentation, export « copier en spec ») ——— */

const sv = (v: StyleValue) => ("token" in v ? v.token : v.value);
const declToSpec = (d: StyleDecl): SpecStyleDecl => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, sv(v!)]));

function styleToSpec(s: StyleSpec, defaults: StyleDecl): SpecStyle | undefined {
  const base = declToSpec(s.base);
  for (const [k, v] of Object.entries(defaults)) if (base[k as StyleKey] === sv(v!)) delete base[k as StyleKey];
  const layers = Object.entries(s).filter(([k, d]) => k !== "base" && d && Object.keys(d).length);
  if (!layers.length) return Object.keys(base).length ? base : undefined;
  return { ...(Object.keys(base).length ? { base } : {}), ...Object.fromEntries(layers.map(([k, d]) => [k, declToSpec(d as StyleDecl)])) };
}

export function docToSpec(doc: ComponentDoc): ComponentSpec {
  const targeted = new Set<string>();
  walk(doc, (n) => n.interactions.forEach((i) => "target" in i.action && targeted.add(i.action.target)));
  const node = (n: Node): SpecNode => {
    const b = findBrick(n.brick)!;
    const out: SpecNode = { brick: n.brick };
    if (targeted.has(n.id)) out.ref = n.id;
    if (n.name !== `${b.label} ${n.id.slice(b.short.length)}`) out.name = n.name;
    const props = Object.fromEntries(Object.entries(n.props).filter(([k, v]) => b.props[k] && b.props[k].default !== v));
    if (Object.keys(props).length) out.props = props;
    const texts: Record<string, string | string[]> = {};
    const textProps: Record<string, string | false> = {};
    for (const tf of b.texts) {
      const t = n.texts[tf.key];
      if (!t) continue;
      texts[tf.key] = t.value;
      if (!t.expose) textProps[tf.key] = false;
      else if (t.propName !== toIdentifier(tf.propHint)) textProps[tf.key] = t.propName;
    }
    if (Object.keys(texts).length) out.texts = texts;
    if (Object.keys(textProps).length) out.textProps = textProps;
    const exposed = doc.exposedProps.filter((e) => e.nodeId === n.id && !(b.exposeByDefault?.includes(e.prop) && e.propName === toIdentifier(e.prop)));
    if (exposed.length) out.exposeProps = Object.fromEntries(exposed.map((e) => [e.prop, e.propName]));
    const style = styleToSpec(n.style, b.defaultStyle ?? {});
    if (style) out.style = style;
    if (n.animation) {
      const { origin: _origin, ...a } = n.animation;
      void _origin;
      out.animation = a;
    }
    if (n.className) out.className = n.className;
    if (n.interactions.length)
      out.onClick = n.interactions.flatMap((i): SpecAction[] => {
        const a = i.action;
        if (a.type === "navigate") return [{ action: "navigate", href: a.href, ...(a.newTab ? { newTab: true } : {}) }];
        if (a.type === "setValue") return [{ action: "setValue", target: a.target, value: a.value }];
        if (a.type === "custom") return [];
        return [{ action: a.type, target: a.target }];
      });
    const main = defaultSlot(b);
    const slots = Object.entries(n.slots).filter(([, ids]) => ids.length);
    for (const [s, ids] of slots) {
      const list = ids.map((id) => node(doc.nodes[id]));
      if (s === main) out.children = list;
      else (out.slots ??= {})[s] = list;
    }
    return out;
  };
  const root = doc.nodes[doc.rootId];
  const def = defaultTheme();
  const spec: ComponentSpec = { format: SPEC_FORMAT, name: doc.name };
  const theme: SpecTheme = {};
  const ref = doc.theme.preset?.id === "beautiful-ui" ? BEAUTIFUL_UI_THEME : def;
  if (doc.theme.preset?.id === "beautiful-ui") theme.preset = "beautiful-ui";
  if (doc.theme.defaultScheme !== "light") theme.defaultScheme = doc.theme.defaultScheme;
  if (doc.theme.radius !== ref.radius) theme.radius = doc.theme.radius;
  for (const scheme of ["light", "dark"] as const) {
    const diff = Object.fromEntries(Object.entries(doc.theme.color[scheme]).filter(([c, v]) => ref.color[scheme][c] !== v));
    if (Object.keys(diff).length) (theme.colors ??= {})[scheme] = diff;
  }
  const exposedColors = doc.theme.exposed;
  if (JSON.stringify(exposedColors) !== JSON.stringify(def.exposed)) theme.exposeColors = Object.fromEntries(exposedColors.map((e) => [e.token, e.propName]));
  if (Object.keys(theme).length) spec.theme = theme;
  const rootDefaults = createEmptyDoc().nodes;
  const rootStyle = styleToSpec(root.style, Object.values(rootDefaults)[0].style.base);
  const rootProps = Object.fromEntries(Object.entries(root.props).filter(([k, v]) => findBrick(ROOT_BRICK)!.props[k]?.default !== v));
  if (rootStyle || Object.keys(rootProps).length || root.animation) {
    spec.root = {};
    if (Object.keys(rootProps).length) spec.root.props = rootProps;
    if (rootStyle) spec.root.style = rootStyle;
    if (root.animation) spec.root.animation = root.animation;
  }
  spec.children = (root.slots.children ?? []).map((id) => node(doc.nodes[id]));
  return spec;
}
