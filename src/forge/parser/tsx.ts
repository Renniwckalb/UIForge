/**
 * index.tsx (édité dans Monaco) → modèle JSON.
 * Reconnaît le format produit par codegen/tsx.ts. Ce qui n'est pas compris est signalé (diagnostics)
 * et, pour le JSX, conservé tel quel dans un nœud « Code non reconnu » : l'édition n'est jamais bloquée.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { tr } from "../../i18n/core";
import { parse } from "@babel/parser";
import { ALL_BRICKS, brickByShort, RAW_BRICK_ID } from "../bricks/registry";
import type { AttrSrc, BrickDefinition, TplEl, TplNode } from "../bricks/types";
import type { Breakpoint, ComponentDoc, Diagnostic, Interaction, Node, NodeId, PropValue, StyleDecl, StyleKey, TextBinding } from "../model/types";
import { BREAKPOINTS } from "../model/types";
import { STYLE_CSS } from "../codegen/css";
import { cssValueToStyle } from "./css";
import { SHORTCUT_HELPER_NAME } from "../runtime/shortcut";
import { createNode, defaultProps, normalizeDoc, toPascal, uniquePropName } from "../model/ops";
import { scopeClass } from "../codegen/css";

type AnyNode = any;
export type ParseResult = { doc: ComponentDoc | null; diagnostics: Diagnostic[] };

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function loc(n: AnyNode): Pick<Diagnostic, "line" | "column" | "endLine" | "endColumn"> {
  if (!n?.loc) return {};
  return { line: n.loc.start.line, column: n.loc.start.column + 1, endLine: n.loc.end.line, endColumn: n.loc.end.column + 1 };
}

function literalValue(n: AnyNode): { ok: true; value: unknown } | { ok: false } {
  if (!n) return { ok: false };
  switch (n.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return { ok: true, value: n.value };
    case "UnaryExpression":
      if (n.operator === "-" && n.argument.type === "NumericLiteral") return { ok: true, value: -n.argument.value };
      return { ok: false };
    case "TemplateLiteral":
      if (n.expressions.length === 0) return { ok: true, value: n.quasis.map((q: AnyNode) => q.value.cooked).join("") };
      return { ok: false };
    case "ArrayExpression": {
      const out: unknown[] = [];
      for (const e of n.elements) {
        const v = literalValue(e);
        if (!v.ok) return { ok: false };
        out.push(v.value);
      }
      return { ok: true, value: out };
    }
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const p of n.properties) {
        if (p.type !== "ObjectProperty") return { ok: false };
        const key = p.key.type === "Identifier" ? p.key.name : p.key.value;
        const v = literalValue(p.value);
        if (!v.ok) return { ok: false };
        out[key] = v.value;
      }
      return { ok: true, value: out };
    }
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "ParenthesizedExpression":
      return literalValue(n.expression);
  }
  return { ok: false };
}

function jsxName(n: AnyNode): string {
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXMemberExpression") return `${jsxName(n.object)}.${n.property.name}`;
  if (n.type === "JSXNamespacedName") return `${n.namespace.name}:${n.name.name}`;
  return "?";
}

/** Texte JSX selon les règles de React (lignes rognées, jointes par un espace) */
function jsxTextValue(raw: string): string {
  const lines = raw.split(/\r?\n/);
  if (lines.length === 1) return raw;
  return lines
    .map((l, i) => (i === 0 ? l.replace(/\s+$/, "") : i === lines.length - 1 ? l.replace(/^\s+/, "") : l.trim()))
    .filter((l) => l.length > 0)
    .join(" ");
}

function meaningfulChildren(children: AnyNode[]): AnyNode[] {
  return children.filter((c) => {
    if (c.type === "JSXText") return jsxTextValue(c.value).trim() !== "" || !/\n/.test(c.value) && c.value.trim() !== "";
    if (c.type === "JSXExpressionContainer" && c.expression.type === "JSXEmptyExpression") return false;
    return true;
  });
}

function stableKey(v: unknown): string {
  return JSON.stringify(v, Object.keys((v as object) ?? {}).sort());
}

type Ctx = {
  code: string;
  scope: string;
  prev: ComponentDoc;
  defaults: Map<string, unknown>; // prop exportée → valeur par défaut
  nodes: Record<NodeId, Node>;
  exposedProps: ComponentDoc["exposedProps"];
  diagnostics: Diagnostic[];
  usedIds: Set<string>;
  /** ids explicitement présents dans le code (classes de nœud) : réservés */
  reserved: Set<string>;
  pendingInteractions: { nodeId: NodeId; fn: AnyNode }[];
};

/** Résultat partiel accumulé pendant la correspondance d'un gabarit */
type Acc = {
  id?: string;
  props: Record<string, PropValue>;
  texts: Record<string, TextBinding>;
  slots: Record<string, NodeId[]>;
  exposed: { prop: string; propName: string }[];
  onClick?: AnyNode;
  warnings: Diagnostic[];
  /** Classes saisies à la main (hors gabarit), expression className dynamique, attributs inconnus */
  rawClasses: string[];
  classNameExpr?: string;
  extraAttrs: Record<string, string>;
  bp: Partial<Record<Breakpoint, StyleDecl>>;
};

const newAcc = (): Acc => ({ props: {}, texts: {}, slots: {}, exposed: [], warnings: [], rawClasses: [], extraAttrs: {}, bp: {} });

const PROP_TO_KEY = new Map<string, StyleKey>();
for (const [k, props] of Object.entries(STYLE_CSS)) for (const p of props) PROP_TO_KEY.set(p, k as StyleKey);
const BP_CLASS = new RegExp(`^(${BREAKPOINTS.join("|")}):\\[([a-z-]+):(.+)\\]!$`);

function tagCandidates(el: TplEl): string[] {
  return typeof el.el === "string" ? [el.el] : Object.values(el.el.map);
}

/** Classes littérales d'un attribut className (chaîne, gabarit `${scopeClassName} …` ou cn(…)) + expressions dynamiques */
function classParts(ctx: Ctx, attrValue: AnyNode): { tokens: string[]; dynamic: string[] } {
  const tokens: string[] = [];
  const dynamic: string[] = [];
  const visit = (e: AnyNode) => {
    if (!e) return;
    if (e.type === "StringLiteral") tokens.push(...e.value.split(/\s+/).filter(Boolean));
    else if (e.type === "TemplateLiteral") {
      tokens.push(...e.quasis.map((q: AnyNode) => q.value.cooked).join(" ").split(/\s+/).filter(Boolean));
      for (const x of e.expressions) if (!(x.type === "Identifier" && x.name === "scopeClassName")) dynamic.push(ctx.code.slice(x.start, x.end));
    } else if (e.type === "Identifier" && e.name === "scopeClassName") return;
    else if (e.type === "CallExpression" && e.callee.type === "Identifier" && e.callee.name === "cn") e.arguments.forEach(visit);
    else dynamic.push(ctx.code.slice(e.start, e.end));
  };
  if (!attrValue) return { tokens, dynamic };
  visit(attrValue.type === "JSXExpressionContainer" ? attrValue.expression : attrValue);
  return { tokens, dynamic };
}

function classTokens(ctx: Ctx, attrValue: AnyNode): string[] | null {
  const r = classParts(ctx, attrValue);
  return r.dynamic.length ? null : r.tokens;
}

function textBinding(ctx: Ctx, expr: AnyNode): TextBinding | null {
  if (!expr) return null;
  if (expr.type === "ArrayExpression") {
    const v = literalValue(expr);
    return v.ok && Array.isArray(v.value) ? { value: v.value.map(String), expose: false, propName: "" } : null;
  }
  if (expr.type === "StringLiteral" || (expr.type === "TemplateLiteral" && !expr.expressions.length)) {
    const v = literalValue(expr);
    return v.ok ? { value: String(v.value), expose: false, propName: "" } : null;
  }
  if (expr.type === "Identifier") {
    const d = ctx.defaults.get(expr.name);
    return { value: (Array.isArray(d) ? d.map(String) : d === undefined ? "" : String(d)) as string | string[], expose: true, propName: expr.name };
  }
  return null;
}

/** Clé de table (toujours une chaîne) → valeur typée selon le schéma de la prop */
function coerce(brick: BrickDefinition, prop: string, key: string): PropValue {
  const f = brick.props[prop];
  if (f?.type === "boolean") return key === "true";
  if (f?.type === "number") return Number(key);
  return key;
}

function matchAttr(ctx: Ctx, brick: BrickDefinition, name: string, src: AttrSrc, attr: AnyNode, acc: Acc): boolean {
  const valueNode = attr.value; // null → attribut booléen nu
  const expr = valueNode?.type === "JSXExpressionContainer" ? valueNode.expression : valueNode;
  if ("lit" in src) return true;
  if ("prop" in src) {
    if ("mapObj" in src) {
      const v = valueNode ? literalValue(expr) : { ok: true as const, value: true };
      if (!v.ok) return false;
      const key = Object.entries(src.mapObj).find(([, o]) => o !== null && stableKey(o) === stableKey(v.value))?.[0];
      if (!key) {
        acc.warnings.push({ severity: "warning", message: tr("Value of “{name}” not recognized, default value used.", { name }), ...loc(attr) });
        return true;
      }
      acc.props[src.prop] = coerce(brick, src.prop, key);
      return true;
    }
    if (!valueNode) {
      acc.props[src.prop] = true;
      return true;
    }
    if (expr.type === "Identifier") {
      acc.exposed.push({ prop: src.prop, propName: expr.name });
      const d = ctx.defaults.get(expr.name);
      if (d !== undefined) acc.props[src.prop] = d as PropValue;
      return true;
    }
    const v = literalValue(expr);
    if (!v.ok || typeof v.value === "object") return false;
    const field = brick.props[src.prop];
    if (field?.type === "enum" && !field.options.some((o) => o.value === v.value)) {
      acc.warnings.push({ severity: "warning", message: tr("“{value}” is not a valid value for {name} ({options}).", { value: String(v.value), name, options: field.options.map((o) => o.value).join(", ") }), ...loc(attr) });
      return true;
    }
    acc.props[src.prop] = v.value as PropValue;
    return true;
  }
  if ("text" in src) {
    const b = textBinding(ctx, expr);
    if (!b) return false;
    acc.texts[src.text] = b;
    return true;
  }
  if ("state" in src) return expr?.type === "Identifier";
  if ("inputRef" in src) return expr?.type === "Identifier";
  if ("openState" in src) return expr?.type === "ArrowFunctionExpression";
  if ("onClick" in src) {
    if (expr?.type !== "ArrowFunctionExpression" && expr?.type !== "FunctionExpression") return false;
    acc.onClick = expr;
    return true;
  }
  return true;
}

function matchEl(ctx: Ctx, brick: BrickDefinition, el: TplEl, jsx: AnyNode, acc: Acc, isItem = false): boolean {
  if (jsx?.type !== "JSXElement") return false;
  const tag = jsxName(jsx.openingElement.name);
  if (typeof el.el === "string") {
    if (el.el !== tag) return false;
  } else {
    const entry = Object.entries(el.el.map).find(([, t]) => t === tag);
    if (!entry) return false;
    acc.props[el.el.prop] = entry[0];
  }
  const classAttr = el.classAttr ?? "className";
  const seen = new Set<string>();
  for (const attr of jsx.openingElement.attributes) {
    if (attr.type !== "JSXAttribute") return false; // spread : non représentable → bloc brut
    const name = attr.name.type === "JSXIdentifier" ? attr.name.name : jsxName(attr.name);
    seen.add(name);
    if (name === "key" || name === "style") continue;
    if (name === classAttr) {
      const { tokens, dynamic } = classParts(ctx, attr.value);
      if (dynamic.length) {
        if (!el.styled) return false;
        acc.classNameExpr = dynamic.join(", ");
        acc.warnings.push({ severity: "info", message: tr("{attr} expression kept as is (outside panels).", { attr: classAttr }), ...loc(attr) });
      }
      const rest = new Set(tokens);
      // Surcharges par breakpoint : md:[padding-inline:var(--space-8)]!
      for (const t of tokens) {
        const m = el.styled ? t.match(BP_CLASS) : null;
        if (!m) continue;
        const [, bp, prop, rawValue] = m;
        rest.delete(t);
        if (prop === "border-style") continue;
        const key = PROP_TO_KEY.get(prop);
        if (!key) {
          rest.add(t);
          continue;
        }
        const value = rawValue.replace(/_/g, " ");
        const own = value.match(/^var\(--([a-zA-Z]+\d+)-(sm|md|lg|xl)-[\w-]+\)$/);
        if (own) {
          const prevV = ctx.prev.nodes[own[1]]?.style[own[2] as Breakpoint]?.[key];
          if (prevV) (acc.bp[bp as Breakpoint] ??= {})[key] = prevV;
          else acc.warnings.push({ severity: "info", message: tr("Value of {name} defined in styles.css (styles.css tab).", { name: t }), ...loc(attr) });
        } else (acc.bp[bp as Breakpoint] ??= {})[key] = cssValueToStyle(value);
      }
      const prefix = `${ctx.scope}__`;
      for (const t of tokens) {
        if (t.startsWith(prefix) && el.styled) {
          acc.id = t.slice(prefix.length);
          rest.delete(t);
        }
      }
      for (const c of (el.classes ?? "").split(/\s+/)) rest.delete(c);
      for (const [prop, map] of Object.entries(el.classProps ?? {})) {
        // valeur dont toutes les classes sont présentes (la plus spécifique d'abord)
        const found = Object.entries(map)
          .filter(([, cls]) => cls && cls.split(/\s+/).every((c) => tokens.includes(c)))
          .sort((a, b) => b[1].length - a[1].length)[0];
        const field = brick.props[prop];
        if (found) {
          acc.props[prop] = field?.type === "boolean" ? found[0] === "true" : found[0];
          for (const c of found[1].split(/\s+/)) rest.delete(c);
        } else {
          const empty = Object.entries(map).find(([, cls]) => !cls);
          if (empty) acc.props[prop] = field?.type === "boolean" ? empty[0] === "true" : empty[0];
        }
      }
      if (rest.size) {
        if (!el.styled) return false; // classe sur un sous-élément de la brique : non représentable → bloc brut
        acc.rawClasses.push(...rest);
        acc.warnings.push({ severity: "info", message: tr("Classes kept outside panels: {classes}", { classes: [...rest].join(" ") }), ...loc(attr) });
      }
      continue;
    }
    const src = el.attrs?.[name];
    const keepRaw = () => {
      if (!el.styled) return false;
      acc.extraAttrs[name] = attr.value ? ctx.code.slice(attr.value.start, attr.value.end) : "";
      acc.warnings.push({ severity: "info", message: tr("Attribute “{name}” kept as is (outside panels).", { name }), ...loc(attr) });
      return true;
    };
    if (!src) {
      if (!keepRaw()) return false;
      continue;
    }
    if (!matchAttr(ctx, brick, name, src, attr, acc)) {
      if (!keepRaw()) return false;
    }
  }
  // Attributs absents → valeurs par défaut
  for (const [name, src] of Object.entries(el.attrs ?? {})) {
    if (seen.has(name)) continue;
    if ("text" in src && !acc.texts[src.text]) acc.texts[src.text] = { value: "", expose: false, propName: "" };
    if ("prop" in src && "mapObj" in src && acc.props[src.prop] === undefined) {
      const k = Object.entries(src.mapObj).find(([, o]) => o === null)?.[0];
      if (k) acc.props[src.prop] = coerce(brick, src.prop, k);
    }
  }
  void isItem;
  return matchChildren(ctx, brick, el.children ?? [], meaningfulChildren(jsx.children), acc);
}

function matchChildren(ctx: Ctx, brick: BrickDefinition, tpl: TplNode[], kids: AnyNode[], acc: Acc): boolean {
  let i = 0;
  for (let t = 0; t < tpl.length; t++) {
    const tn = tpl[t];
    const kid = kids[i];
    if ("text" in tn) {
      if (kid?.type === "JSXText") {
        acc.texts[tn.text] = { value: jsxTextValue(kid.value).trim(), expose: false, propName: "" };
        i++;
      } else if (kid?.type === "JSXExpressionContainer") {
        const b = textBinding(ctx, kid.expression);
        if (!b) return false;
        acc.texts[tn.text] = b;
        i++;
      } else acc.texts[tn.text] ??= { value: "", expose: false, propName: "" };
      continue;
    }
    if ("staticText" in tn) continue;
    if ("itemText" in tn) {
      if (kid?.type === "JSXExpressionContainer" && kid.expression.type === "Identifier") {
        i++;
        continue;
      }
      return false;
    }
    if ("slot" in tn) {
      const after = tpl.slice(t + 1).filter((x) => !("slot" in x) && !("staticText" in x)).length;
      const take = Math.max(0, kids.length - i - after);
      const ids: NodeId[] = [];
      for (const k of kids.slice(i, i + take)) {
        const id = parseNode(ctx, k);
        if (id) ids.push(id);
      }
      acc.slots[tn.slot] = ids;
      i += take;
      continue;
    }
    if ("list" in tn) {
      if (kid?.type !== "JSXExpressionContainer") return false;
      const call = kid.expression;
      if (call.type !== "CallExpression" || call.callee.type !== "MemberExpression" || call.callee.property.name !== "map") return false;
      const obj = call.callee.object;
      if (obj.type === "Identifier") {
        const d = ctx.defaults.get(obj.name);
        acc.texts[tn.list] = { value: Array.isArray(d) ? d.map(String) : [], expose: true, propName: obj.name };
      } else {
        const v = literalValue(obj);
        if (!v.ok || !Array.isArray(v.value)) return false;
        acc.texts[tn.list] = { value: v.value.map(String), expose: false, propName: "" };
      }
      const fn = call.arguments[0];
      let body = fn?.body;
      while (body?.type === "ParenthesizedExpression") body = body.expression;
      if (!body || !matchEl(ctx, brick, tn.item, body, acc, true)) return false;
      i++;
      continue;
    }
    if ("ifProp" in tn || "ifText" in tn) {
      const key = "ifProp" in tn ? tn.ifProp : tn.ifText;
      if (kid?.type === "JSXExpressionContainer" && kid.expression.type === "LogicalExpression" && kid.expression.operator === "&&" && kid.expression.left.type === "Identifier") {
        const ident = kid.expression.left.name;
        let right = kid.expression.right;
        while (right.type === "ParenthesizedExpression") right = right.expression;
        const inner = right.type === "JSXFragment" ? meaningfulChildren(right.children) : [right];
        if (!matchChildren(ctx, brick, tn.then, inner, acc)) return false;
        if ("ifProp" in tn) {
          acc.exposed.push({ prop: key, propName: ident });
          const d = ctx.defaults.get(ident);
          acc.props[key] = d === undefined ? true : (d as PropValue);
        }
        i++;
        continue;
      }
      // Forme littérale : le contenu est présent → condition vraie
      const probe: Acc = { ...acc, props: { ...acc.props }, texts: { ...acc.texts }, slots: { ...acc.slots }, exposed: [...acc.exposed], warnings: [] };
      const firstEl = tn.then.find((x) => "el" in x) as TplEl | undefined;
      if (firstEl && kid && matchEl(ctx, brick, firstEl, kid, probe)) {
        Object.assign(acc, probe, { warnings: [...acc.warnings, ...probe.warnings] });
        if ("ifProp" in tn) acc.props[key] = true;
        i++;
      } else if ("ifProp" in tn) acc.props[key] = false;
      else acc.texts[key] ??= { value: "", expose: false, propName: "" };
      continue;
    }
    if ("ifSlot" in tn) {
      const firstEl = tn.then.find((x) => "el" in x) as TplEl | undefined;
      if (firstEl && kid?.type === "JSXElement" && tagCandidates(firstEl).includes(jsxName(kid.openingElement.name))) {
        if (!matchEl(ctx, brick, firstEl, kid, acc)) return false;
        i++;
      } else acc.slots[tn.ifSlot] ??= [];
      continue;
    }
    // élément du gabarit
    if (!kid || !matchEl(ctx, brick, tn, kid, acc)) return false;
    i++;
  }
  return i === kids.length;
}

function freshId(ctx: Ctx, short: string, wanted?: string): string {
  if (wanted && /^[a-z][a-zA-Z]*\d+$/.test(wanted) && !ctx.usedIds.has(wanted)) return wanted;
  let n = 1;
  while (ctx.usedIds.has(`${short}${n}`) || ctx.reserved.has(`${short}${n}`)) n++;
  return `${short}${n}`;
}

function candidatesFor(ctx: Ctx, jsx: AnyNode): BrickDefinition[] {
  const tag = jsxName(jsx.openingElement.name);
  // 1. classe de nœud sur l'élément racine → brique par préfixe d'id
  const classAttr = jsx.openingElement.attributes.find((a: AnyNode) => a.type === "JSXAttribute" && /className$/i.test(a.name.name ?? ""));
  const tokens = classAttr ? (classTokens(ctx, classAttr.value) ?? []) : [];
  const id = tokens.find((t) => t.startsWith(`${ctx.scope}__`))?.slice(ctx.scope.length + 2);
  const byTag = ALL_BRICKS.filter((b) => tagCandidates(b.tpl).includes(tag));
  if (id) {
    const b = brickByShort(id.replace(/\d+$/, ""));
    if (b && byTag.includes(b)) return [b, ...byTag.filter((x) => x !== b)];
  }
  // 2. briques dont la racine du gabarit a ce tag (les plus spécifiques d'abord)
  return byTag.sort((a, b) => Number(typeof a.tpl.el !== "string") - Number(typeof b.tpl.el !== "string"));
}

function rawNode(ctx: Ctx, jsx: AnyNode, reason: string): NodeId {
  const id = freshId(ctx, "raw");
  ctx.usedIds.add(id);
  const code = ctx.code.slice(jsx.start, jsx.end);
  ctx.nodes[id] = {
    id,
    brick: RAW_BRICK_ID,
    name: `Code non reconnu ${id.slice(3)}`,
    parentId: null,
    slots: {},
    props: { code },
    texts: {},
    style: { base: {} },
    interactions: [],
  };
  ctx.diagnostics.push({ severity: "warning", message: tr("{reason} Fragment kept as is (not visually editable).", { reason }), ...loc(jsx) });
  return id;
}

function parseNode(ctx: Ctx, jsx: AnyNode): NodeId | null {
  if (jsx.type === "JSXText") {
    const v = jsxTextValue(jsx.value).trim();
    if (!v) return null;
    return rawNode(ctx, jsx, tr("Free text “{text}” outside a brick.", { text: v.slice(0, 30) }));
  }
  if (jsx.type !== "JSXElement") return rawNode(ctx, jsx, tr("Unrecognized JSX expression."));
  for (const brick of candidatesFor(ctx, jsx)) {
    const acc: Acc = newAcc();
    // Les enfants parsés ajoutent des nœuds à ctx : on travaille sur un instantané pour pouvoir annuler
    const snapshot = { nodes: { ...ctx.nodes }, used: new Set(ctx.usedIds), diags: ctx.diagnostics.length, pending: ctx.pendingInteractions.length };
    if (matchEl(ctx, brick, brick.tpl, jsx, acc)) {
      const id = freshId(ctx, brick.short, acc.id);
      ctx.usedIds.add(id);
      const prev = ctx.prev.nodes[id]?.brick === brick.id ? ctx.prev.nodes[id] : null;
      const base: Node = prev ? structuredClone(prev) : createNode({ ...ctx.prev, nodes: { ...ctx.prev.nodes, ...ctx.nodes }, exposedProps: [] } as ComponentDoc, brick.id);
      base.id = id;
      base.props = { ...defaultProps(brick), ...acc.props };
      const texts: Record<string, TextBinding> = {};
      for (const tf of brick.texts) {
        const b = acc.texts[tf.key];
        const prevB = prev?.texts[tf.key];
        if (!b) {
          texts[tf.key] = prevB ?? { value: tf.default, expose: false, propName: tf.propHint };
          continue;
        }
        texts[tf.key] = { value: b.value, expose: b.expose, propName: b.expose ? b.propName : (prevB?.propName ?? tf.propHint) };
      }
      base.texts = texts;
      base.slots = {};
      for (const s of Object.keys(brick.slots ?? {})) base.slots[s] = acc.slots[s] ?? [];
      base.interactions = [];
      base.parentId = null;
      for (const bp of BREAKPOINTS) {
        if (acc.bp[bp] && Object.keys(acc.bp[bp]!).length) base.style[bp] = acc.bp[bp];
        else delete base.style[bp];
      }
      if (acc.rawClasses.length) base.className = acc.rawClasses.join(" ");
      else delete base.className;
      if (acc.classNameExpr) base.classNameExpr = acc.classNameExpr;
      else delete base.classNameExpr;
      if (Object.keys(acc.extraAttrs).length) base.extraAttrs = acc.extraAttrs;
      else delete base.extraAttrs;
      if (!prev) base.name = `${brick.label} ${id.replace(/^\D+/, "")}`;
      ctx.nodes[id] = base;
      for (const e of acc.exposed) ctx.exposedProps.push({ nodeId: id, prop: e.prop, propName: e.propName });
      if (acc.onClick) ctx.pendingInteractions.push({ nodeId: id, fn: acc.onClick });
      ctx.diagnostics.push(...acc.warnings);
      return id;
    }
    ctx.nodes = snapshot.nodes;
    ctx.usedIds = snapshot.used;
    ctx.diagnostics.length = snapshot.diags;
    ctx.pendingInteractions.length = snapshot.pending;
  }
  const tag = jsxName(jsx.openingElement.name);
  return rawNode(ctx, jsx, tr("<{tag}> does not match any known brick (or its structure was changed).", { tag }));
}

function setterToId(name: string): { id: string; kind: "open" | "value" } | null {
  const m = name.match(/^set([A-Za-z]+\d+)(Open|Value)$/);
  return m ? { id: lc(m[1]), kind: m[2] === "Open" ? "open" : "value" } : null;
}

function parseInteractions(ctx: Ctx, nodeId: NodeId, fn: AnyNode): Interaction[] {
  const stmts: AnyNode[] = fn.body.type === "BlockStatement" ? fn.body.body.map((s: AnyNode) => (s.type === "ExpressionStatement" ? s.expression : s)) : [fn.body];
  const out: Interaction[] = [];
  for (const e of stmts) {
    if (e.type === "CallExpression" && e.callee.type === "Identifier") {
      const t = setterToId(e.callee.name);
      const arg = e.arguments[0];
      if (t && ctx.nodes[t.id]) {
        if (t.kind === "open" && arg?.type === "BooleanLiteral") {
          out.push({ trigger: "click", action: { type: arg.value ? "open" : "close", target: t.id } });
          continue;
        }
        if (t.kind === "open" && (arg?.type === "ArrowFunctionExpression" || arg?.type === "FunctionExpression")) {
          out.push({ trigger: "click", action: { type: "toggle", target: t.id } });
          continue;
        }
        const v = literalValue(arg);
        if (t.kind === "value" && v.ok && typeof v.value === "number") {
          out.push({ trigger: "click", action: { type: "setValue", target: t.id, value: v.value } });
          continue;
        }
      }
    }
    if (e.type === "CallExpression" && e.callee.type === "MemberExpression") {
      const src = ctx.code.slice(e.callee.start, e.callee.end).replace(/\s/g, "");
      const href = literalValue(e.arguments[0]);
      if (src === "window.location.assign" && href.ok) {
        out.push({ trigger: "click", action: { type: "navigate", href: String(href.value) } });
        continue;
      }
      if (src === "window.open" && href.ok) {
        out.push({ trigger: "click", action: { type: "navigate", href: String(href.value), newTab: true } });
        continue;
      }
    }
    out.push({ trigger: "click", action: { type: "custom", code: ctx.code.slice(e.start, e.end) } });
    ctx.diagnostics.push({ severity: "info", message: tr("Custom click action kept as is (not editable in the Behavior panel)."), ...loc(e) });
  }
  void nodeId;
  return out;
}

export function parseTsx(code: string, prev: ComponentDoc): ParseResult {
  const diagnostics: Diagnostic[] = [];
  let ast: AnyNode;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: false });
  } catch (e: any) {
    const l = e.loc ?? {};
    diagnostics.push({ severity: "error", message: `Erreur de syntaxe : ${String(e.message).replace(/\s*\(\d+:\d+\)$/, "")}`, line: l.line, column: (l.column ?? 0) + 1 });
    return { doc: null, diagnostics };
  }

  const program = ast.program;
  const exp = program.body.find((s: AnyNode) => s.type === "ExportDefaultDeclaration");
  let fn = exp?.declaration;
  if (fn?.type === "Identifier") fn = program.body.find((s: AnyNode) => s.type === "FunctionDeclaration" && s.id?.name === exp.declaration.name);
  if (!fn || (fn.type !== "FunctionDeclaration" && fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression")) {
    diagnostics.push({ severity: "error", message: tr("No `export default function …` component found.") });
    return { doc: null, diagnostics };
  }
  const name = fn.id?.name ? toPascal(fn.id.name) : prev.name;
  const scope = scopeClass({ ...prev, name });

  // Imports et déclarations non reconnus : conservés tels quels
  const knownSources = new Set(["react", "./styles.css", "cn", ...ALL_BRICKS.flatMap((b) => b.imports.map((i) => i.from))]);
  const preservedImports: string[] = [];
  const preservedModule: string[] = [];
  const interfaceName = `${fn.id?.name ?? ""}Props`;
  for (const s of program.body) {
    const src = code.slice(s.start, s.end);
    if (s.type === "ImportDeclaration") {
      if (!knownSources.has(s.source.value)) {
        preservedImports.push(src);
        diagnostics.push({ severity: "info", message: tr("Import “{source}” kept as is.", { source: String(s.source.value) }), ...loc(s) });
      }
      continue;
    }
    if (s === exp || s === fn || (s.type === "ExpressionStatement" && s.directive) || (s.type === "ExpressionStatement" && s.expression?.type === "StringLiteral")) continue;
    if (s.type === "FunctionDeclaration" && s.id?.name === SHORTCUT_HELPER_NAME) continue; // régénéré
    const iface = s.type === "ExportNamedDeclaration" ? s.declaration : s;
    if (iface?.type === "TSInterfaceDeclaration" && iface.id?.name === interfaceName) continue; // régénérée depuis les props
    preservedModule.push(src);
    diagnostics.push({ severity: "info", message: tr("Declaration outside the component kept as is."), ...loc(s) });
  }

  // Props et valeurs par défaut
  const defaults = new Map<string, unknown>();
  const param = fn.params[0];
  if (param?.type === "ObjectPattern") {
    for (const p of param.properties) {
      if (p.type !== "ObjectProperty") continue;
      const key = p.key.name;
      if (p.value.type === "AssignmentPattern") {
        const v = literalValue(p.value.right);
        if (v.ok) defaults.set(key, v.value);
        else diagnostics.push({ severity: "warning", message: tr("Default value of “{key}” is not a literal (ignored).", { key }), ...loc(p) });
      } else defaults.set(key, undefined);
    }
  }

  const reserved = new Set([...code.matchAll(new RegExp(`${scope}__([A-Za-z]+\d+)`, "g"))].map((m) => m[1]));
  const ctx: Ctx = { code, scope, prev, defaults, nodes: {}, exposedProps: [], diagnostics, usedIds: new Set(), reserved, pendingInteractions: [] };
  const states = new Map<string, { init: unknown; node: AnyNode }>();
  const animateTargets = new Map<string, number>();
  const hotkeys: { nodeId: string; shortcut: AnyNode; enable: string | null }[] = [];
  const preservedBody: string[] = [];
  const keepBody = (st: AnyNode, what: string) => {
    preservedBody.push(code.slice(st.start, st.end));
    diagnostics.push({ severity: "info", message: tr("{what} kept as is in the component body.", { what }), ...loc(st) });
  };
  const exposedTokens: { token: string; propName: string }[] = [];
  let rootJsx: AnyNode = null;

  const body = fn.body.type === "BlockStatement" ? fn.body.body : [{ type: "ReturnStatement", argument: fn.body }];
  for (const st of body) {
    if (st.type === "VariableDeclaration") {
      for (const d of st.declarations) {
        const init = d.init;
        const isUseState = init?.type === "CallExpression" && /^(React\.)?useState$/.test(code.slice(init.callee.start, init.callee.end));
        if (d.id.type === "ArrayPattern" && isUseState) {
          const setter = d.id.elements[1]?.name;
          const v = literalValue(init.arguments[0]);
          if (setter && v.ok && setterToId(setter)) states.set(setter, { init: v.value, node: st });
          else keepBody(st, tr("State"));
          continue;
        }
        if (d.id.type === "Identifier" && /^[a-z][a-zA-Z]*\d+InputRef$/.test(d.id.name)) continue; // ref générée
        if (d.id.name === "scopeClassName") continue;
        if (d.id.name === "scopeStyle") {
          let obj = init;
          while (obj?.type === "TSAsExpression") obj = obj.expression;
          for (const p of obj?.properties ?? []) {
            const key = p.key?.value ?? p.key?.name;
            if (typeof key === "string" && key.startsWith("--") && p.value.type === "Identifier") exposedTokens.push({ token: key.slice(2), propName: p.value.name });
          }
          continue;
        }
        keepBody(st, tr("Variable “{name}”", { name: d.id.name ?? "?" }));
        break;
      }
      continue;
    }
    if (st.type === "ExpressionStatement" && st.expression.type === "CallExpression" && /^(React\.)?useEffect$/.test(code.slice(st.expression.callee.start, st.expression.callee.end))) {
      const src = code.slice(st.start, st.end);
      const hk = src.match(/matchesShortcut\(\s*e\s*,\s*("(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*)\s*\)/);
      const target = src.match(/(set[A-Z][A-Za-z]*\d+Open)\(\s*\(?\s*\w+\s*\)?\s*=>/) ?? src.match(/([a-z][a-zA-Z]*\d+)InputRef\.current\?\.focus\(\)/);
      const guard = src.match(/if\s*\(\s*!\s*([A-Za-z_$][\w$]*)\s*\)\s*return/);
      const av = src.match(/setTimeout\(\s*\(\)\s*=>\s*(set\w+)\(\s*(-?[\d.]+)\s*\)/);
      if (hk && target) {
        const nodeId = target[1].startsWith("set") ? setterToId(target[1])!.id : target[1];
        hotkeys.push({ nodeId, shortcut: hk[1], enable: guard?.[1] ?? null });
      } else if (av) animateTargets.set(av[1], Number(av[2]));
      else keepBody(st, tr("Side effect"));
      continue;
    }
    if (st.type === "ReturnStatement") {
      let a = st.argument;
      while (a?.type === "ParenthesizedExpression") a = a.expression;
      rootJsx = a;
      continue;
    }
    keepBody(st, tr("Statement"));
  }

  if (!rootJsx || rootJsx.type !== "JSXElement") {
    diagnostics.push({ severity: "error", message: tr("The component must return a single root JSX element."), ...loc(rootJsx ?? fn) });
    return { doc: null, diagnostics };
  }

  const rootId = parseNode(ctx, rootJsx);
  if (!rootId) {
    diagnostics.push({ severity: "error", message: tr("Root not recognized.") });
    return { doc: null, diagnostics };
  }

  // États contrôlés → props initiales
  for (const [setter, s] of states) {
    const t = setterToId(setter);
    const node = t && ctx.nodes[t.id];
    const brick = node && brickByShort(t.id.replace(/\d+$/, ""));
    if (!node || !brick?.state) {
      diagnostics.push({ severity: "warning", message: tr("State “{setter}” with no matching element (ignored).", { setter }), ...loc(s.node) });
      continue;
    }
    if (brick.state.kind === "open") node.props[brick.state.initialProp] = s.init === true;
    else {
      const target = animateTargets.get(setter);
      if (target !== undefined && brick.state.fromProp) {
        node.props[brick.state.fromProp] = Number(s.init);
        node.props[brick.state.initialProp] = target;
        node.props.animateOnMount = true;
      } else {
        node.props[brick.state.initialProp] = Number(s.init);
        if ("animateOnMount" in node.props) node.props.animateOnMount = false;
      }
    }
  }
  // Raccourcis clavier : valeurs et props exposées (shortcut / enableShortcut)
  for (const n of Object.values(ctx.nodes)) {
    const brick = brickByShort(n.id.replace(/\d+$/, ""));
    if (brick?.effect?.kind !== "hotkey") continue;
    const eff = brick.effect;
    const h = hotkeys.find((x) => x.nodeId === n.id);
    if (!h) {
      n.props[eff.enableProp] = false; // pas d'effet → raccourci désactivé
      continue;
    }
    if (h.shortcut.startsWith('"')) n.props[eff.shortcutProp] = JSON.parse(h.shortcut);
    else {
      ctx.exposedProps.push({ nodeId: n.id, prop: eff.shortcutProp, propName: h.shortcut });
      const d = defaults.get(h.shortcut);
      if (typeof d === "string") n.props[eff.shortcutProp] = d;
    }
    if (h.enable) {
      ctx.exposedProps.push({ nodeId: n.id, prop: eff.enableProp, propName: h.enable });
      const d = defaults.get(h.enable);
      n.props[eff.enableProp] = d !== false;
    } else n.props[eff.enableProp] = true;
  }
  for (const p of ctx.pendingInteractions) ctx.nodes[p.nodeId].interactions = parseInteractions(ctx, p.nodeId, p.fn);

  const doc: ComponentDoc = {
    ...structuredClone(prev),
    name,
    rootId,
    nodes: ctx.nodes,
    exposedProps: ctx.exposedProps,
    preservedImports,
    preservedCode: { module: preservedModule, body: preservedBody },
  };
  // Tokens exposés (scopeStyle) et schéma par défaut
  const themeExposed = exposedTokens.length || prev.theme.exposed.length ? exposedTokens : prev.theme.exposed;
  doc.theme = { ...doc.theme, exposed: themeExposed };
  const scheme = defaults.get("colorScheme");
  if (scheme === "light" || scheme === "dark") doc.theme.defaultScheme = scheme;

  // Noms de props dupliqués
  const seen = new Map<string, string>();
  for (const n of Object.values(doc.nodes))
    for (const [k, t] of Object.entries(n.texts)) {
      if (!t.expose) continue;
      if (seen.has(t.propName) && seen.get(t.propName) !== `${n.id}.${k}`) {
        diagnostics.push({ severity: "info", message: tr("The prop “{name}” is used by several texts: renamed.", { name: t.propName }) });
        t.propName = uniquePropName(doc, t.propName, { nodeId: n.id, key: k });
      }
      seen.set(t.propName, `${n.id}.${k}`);
    }
  normalizeDoc(doc);
  return { doc, diagnostics };
}
