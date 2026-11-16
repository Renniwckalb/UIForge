/**
 * Modèle JSON → index.tsx autonome (React + bibliothèques réellement utilisées).
 * Le format produit est volontairement régulier : le parseur (parser/tsx.ts) sait le relire.
 */
import { getLocale, tr, translateNodeName } from "../../i18n/core";
import { findBrick, RAW_BRICK_ID } from "../bricks/registry";
import type { AttrSrc, BrickDefinition, ImportSpec, PropField, TplEl, TplNode } from "../bricks/types";
import type { ComponentDoc, Interaction, Node } from "../model/types";
import { toPascal, walk } from "../model/ops";
import { breakpointClasses, nodeClass, scopeClass } from "./css";
import { SHORTCUT_HELPER_SOURCE } from "../runtime/shortcut";
import { SVG_BRICK_ID } from "../bricks/defs/svg";
import { jsxAttrPair, prepareSvg, scopeSvgIds, svgChildrenToJsx } from "../svg/svg";

export type GenResult = {
  code: string;
  componentName: string;
  /** Bibliothèques/paquets npm utilisés directement par le composant */
  npm: string[];
  /** Fichiers vendored nécessaires (ui/button.tsx…) */
  vendored: string[];
  usage: string;
  usageCustom: string;
  props: PropDoc[];
};

export type PropDoc = { name: string; type: string; comment: string; defaultValue?: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function stateNames(node: Node, brick: BrickDefinition) {
  if (!brick.state) return null;
  const suffix = brick.state.kind === "open" ? "Open" : "Value";
  return { value: `${node.id}${suffix}`, setter: `set${cap(node.id)}${suffix}` };
}

export function inputRefName(node: Node) {
  return `${node.id}InputRef`;
}

export function jsString(s: string) {
  return JSON.stringify(s);
}

function jsLiteral(v: unknown): string {
  if (typeof v === "string") return jsString(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null || v === undefined) return "undefined";
  if (Array.isArray(v)) return `[${v.map(jsLiteral).join(", ")}]`;
  return `{ ${Object.entries(v as Record<string, unknown>)
    .map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : jsString(k)}: ${jsLiteral(x)}`)
    .join(", ")} }`;
}

function jsxText(s: string): string {
  if (s === "") return "";
  if (/^[^{}<>\n]*$/.test(s) && s.trim() === s && !/\s{2,}/.test(s)) return s;
  return `{${jsString(s)}}`;
}

export function interactionStatements(doc: ComponentDoc, list: Interaction[]): string[] {
  const out: string[] = [];
  for (const it of list) {
    const a = it.action;
    if (a.type === "custom") {
      out.push(a.code.replace(/;\s*$/, ""));
      continue;
    }
    if (a.type === "navigate") {
      out.push(a.newTab ? `window.open(${jsString(a.href)}, "_blank", "noopener")` : `window.location.assign(${jsString(a.href)})`);
      continue;
    }
    const target = doc.nodes[a.target];
    const tb = target && findBrick(target.brick);
    const names = target && tb ? stateNames(target, tb) : null;
    if (!names) continue;
    if (a.type === "open") out.push(`${names.setter}(true)`);
    else if (a.type === "close") out.push(`${names.setter}(false)`);
    else if (a.type === "toggle") out.push(`${names.setter}((v) => !v)`);
    else if (a.type === "setValue") out.push(`${names.setter}(${a.value})`);
  }
  return out;
}

type Ctx = {
  doc: ComponentDoc;
  scope: string;
  used: Set<string>;
  exposedProp: Map<string, string>; // `${nodeId}.${prop}` → propName
  vendored: Set<string>;
  npm: Set<string>;
  usesCn: boolean;
};

function tagOf(el: TplEl, node: Node): string {
  if (typeof el.el === "string") return el.el;
  const v = String(node.props[el.el.prop]);
  return el.el.map[v] ?? Object.values(el.el.map)[0];
}

function classesOf(ctx: Ctx, el: TplEl, node: Node): string {
  const parts: string[] = [];
  if (el.styled) parts.push(nodeClass(ctx.doc, node.id));
  if (el.classes) parts.push(el.classes);
  for (const [prop, map] of Object.entries(el.classProps ?? {})) {
    const c = map[String(node.props[prop])];
    if (c) parts.push(c);
  }
  if (el.styled) parts.push(...breakpointClasses(node));
  return parts.join(" ");
}

function isScopeEl(ctx: Ctx, el: TplEl, node: Node) {
  return !!el.scope || (node.id === ctx.doc.rootId && !!el.styled);
}

function attrValue(ctx: Ctx, src: AttrSrc, node: Node, brick: BrickDefinition, attrName: string): string | null {
  if ("lit" in src) return src.lit === true ? "" : `{${jsLiteral(src.lit)}}`.replace(/^\{(".*")\}$/, "$1");
  if ("prop" in src) {
    const exposed = ctx.exposedProp.get(`${node.id}.${src.prop}`);
    if ("mapObj" in src) {
      const obj = src.mapObj[String(node.props[src.prop])];
      if (obj === null || obj === undefined || obj === false) return null;
      if (obj === true) return "";
      if (typeof obj === "string") return jsString(obj);
      return `{${jsLiteral(obj)}}`;
    }
    if (exposed) return `{${exposed}}`;
    const v = node.props[src.prop];
    const field: PropField | undefined = brick.props[src.prop];
    const always = "always" in src && src.always;
    if (!always && field && v === field.default) return null;
    if (v === undefined) return null;
    if (v === true) return "";
    if (typeof v === "string") return jsString(v);
    return `{${String(v)}}`;
  }
  if ("text" in src) {
    const b = node.texts[src.text];
    if (!b) return null;
    if (b.expose) return `{${b.propName}}`;
    if (Array.isArray(b.value)) return `{${jsLiteral(b.value)}}`;
    if (b.value === "") return null;
    return jsString(String(b.value));
  }
  if ("state" in src) {
    const names = stateNames(node, brick);
    if (!names) return null;
    return `{${src.state === "value" ? names.value : names.setter}}`;
  }
  if ("inputRef" in src) return `{${inputRefName(node)}}`;
  if ("openState" in src) {
    const names = stateNames(node, brick);
    return names ? `{() => ${names.setter}(true)}` : null;
  }
  if ("onClick" in src) {
    const st = interactionStatements(ctx.doc, node.interactions);
    if (!st.length) return null;
    if (st.length === 1) return `{() => ${st[0]}}`;
    return `{() => {\n${st.map((s) => `  ${s};`).join("\n")}\n}}`;
  }
  void attrName;
  return null;
}

function formatAttrs(attrs: [string, string][], indent: string): { inline: string; multi: string[] } {
  const parts = attrs.map(([k, v]) => (v === "" ? k : `${k}=${v}`));
  return { inline: parts.length ? " " + parts.join(" ") : "", multi: parts.map((p) => indent + "  " + p.replace(/\n/g, "\n" + indent + "  ")) };
}

/** Contenu imposé par une brique traitée à part (SVG) : attributs ajoutés et enfants déjà générés */
type ElExtra = { attrs: [string, string][]; children: string[] };

function emitEl(ctx: Ctx, el: TplEl, node: Node, brick: BrickDefinition, indent: string, inList = false, extra?: ElExtra): string[] {
  const tag = tagOf(el, node);
  ctx.used.add(tag.split(".")[0]);
  const attrs: [string, string][] = [];
  if (inList) attrs.push(["key", "{item}"]);
  const cls = classesOf(ctx, el, node);
  const classAttr = el.classAttr ?? "className";
  // Classes saisies à la main : fusionnées avec cn() (tailwind-merge), elles gagnent en cas de conflit
  const raw = el.styled ? [node.className?.trim() ? jsString(node.className.trim()) : "", node.classNameExpr ?? ""].filter(Boolean) : [];
  if (raw.length) {
    ctx.usesCn = true;
    const args = [isScopeEl(ctx, el, node) ? "scopeClassName" : "", cls ? jsString(cls) : "", ...raw].filter(Boolean);
    attrs.push([classAttr, `{cn(${args.join(", ")})}`]);
    if (isScopeEl(ctx, el, node)) attrs.push(["style", "{scopeStyle}"]);
  } else if (isScopeEl(ctx, el, node)) {
    attrs.push([classAttr, cls ? `{\`\${scopeClassName} ${cls}\`}` : "{scopeClassName}"]);
    attrs.push(["style", "{scopeStyle}"]);
  } else if (cls) {
    attrs.push([classAttr, jsString(cls)]);
  }
  for (const [name, src] of Object.entries(el.attrs ?? {})) {
    const v = attrValue(ctx, src, node, brick, name);
    if (v !== null) attrs.push([name, v]);
  }
  if (extra) for (const [name, v] of extra.attrs) if (!(name === "style" && attrs.some(([k]) => k === "style"))) attrs.push([name, v]);
  // Attributs saisis à la main, conservés tels quels
  if (el.styled) for (const [name, v] of Object.entries(node.extraAttrs ?? {})) attrs.push([name, v]);
  const children = extra ? extra.children : (el.children ?? []).flatMap((c) => emitTpl(ctx, c, node, brick, indent + "  "));
  const a = formatAttrs(attrs, indent);
  const openInline = `${indent}<${tag}${a.inline}`;
  const multiline = openInline.length > 100 || a.inline.includes("\n");
  const open = multiline ? [`${indent}<${tag}`, ...a.multi] : [openInline];
  if (!children.length) {
    if (multiline) return [...open, `${indent}/>`];
    return [`${open[0]} />`];
  }
  // Un seul enfant texte court → sur une ligne
  if (!multiline && children.length === 1 && !children[0].trim().startsWith("<") && !children[0].includes("\n")) {
    const line = `${open[0]}>${children[0].trim()}</${tag}>`;
    if (line.length <= 110) return [line];
  }
  if (multiline) return [...open, `${indent}>`, ...children, `${indent}</${tag}>`];
  return [`${open[0]}>`, ...children, `${indent}</${tag}>`];
}

function emitTpl(ctx: Ctx, t: TplNode, node: Node, brick: BrickDefinition, indent: string): string[] {
  if ("text" in t) {
    const b = node.texts[t.text];
    if (!b) return [];
    if (b.expose) return [`${indent}{${b.propName}}`];
    const s = jsxText(String(b.value));
    return s ? [indent + s] : [];
  }
  if ("staticText" in t) return [indent + jsxText(t.staticText)];
  if ("itemText" in t) return [`${indent}{item}`];
  if ("slot" in t) {
    return (node.slots[t.slot] ?? []).flatMap((cid) => {
      const c = ctx.doc.nodes[cid];
      return c ? emitNode(ctx, c, indent) : [];
    });
  }
  if ("list" in t) {
    const b = node.texts[t.list];
    if (!b) return [];
    const arr = b.expose ? b.propName : jsLiteral(Array.isArray(b.value) ? b.value : [b.value]);
    const item = emitEl(ctx, t.item, node, brick, indent + "  ", true);
    return [`${indent}{${arr}.map((item) => (`, ...item, `${indent}))}`];
  }
  if ("ifProp" in t) {
    const exposed = ctx.exposedProp.get(`${node.id}.${t.ifProp}`);
    if (exposed) {
      const inner = t.then.flatMap((c) => emitTpl(ctx, c, node, brick, indent + "  "));
      return [`${indent}{${exposed} && (`, ...wrapFragment(inner, indent + "  "), `${indent})}`];
    }
    return node.props[t.ifProp] ? t.then.flatMap((c) => emitTpl(ctx, c, node, brick, indent)) : [];
  }
  if ("ifText" in t) {
    const b = node.texts[t.ifText];
    if (!b) return [];
    if (b.expose) {
      const inner = t.then.flatMap((c) => emitTpl(ctx, c, node, brick, indent + "  "));
      return [`${indent}{${b.propName} && (`, ...wrapFragment(inner, indent + "  "), `${indent})}`];
    }
    return b.value ? t.then.flatMap((c) => emitTpl(ctx, c, node, brick, indent)) : [];
  }
  if ("ifSlot" in t) {
    return (node.slots[t.ifSlot] ?? []).length ? t.then.flatMap((c) => emitTpl(ctx, c, node, brick, indent)) : [];
  }
  return emitEl(ctx, t, node, brick, indent);
}

function wrapFragment(lines: string[], indent: string): string[] {
  const roots = lines.filter((l) => l.startsWith(indent + "<") && !l.startsWith(indent + "</") && !l.startsWith(indent + "  "));
  if (roots.length <= 1) return lines;
  return [`${indent}<>`, ...lines.map((l) => "  " + l), `${indent}</>`];
}

function emitNode(ctx: Ctx, node: Node, indent: string): string[] {
  if (node.brick === RAW_BRICK_ID) {
    const code = String(node.props.code ?? "");
    const lines = code.split("\n");
    const minIndent = Math.min(...lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length), Infinity);
    return lines.map((l, i) => indent + (i === 0 ? l.trimStart() : l.slice(Number.isFinite(minIndent) ? minIndent : 0)));
  }
  const brick = findBrick(node.brick);
  if (!brick) return [`${indent}{/* brique inconnue : ${node.brick} */}`];
  brick.library.npm.forEach((p) => ctx.npm.add(p));
  brick.library.vendored?.forEach((v) => ctx.vendored.add(v));
  if (brick.id === SVG_BRICK_ID) return emitEl(ctx, brick.tpl, node, brick, indent, false, svgExtra(ctx, node, indent));
  return emitEl(ctx, brick.tpl, node, brick, indent);
}

/** Préfixe des identifiants internes d'un SVG (dégradés, masques…) : unique par composant et par nœud */
export function svgIdPrefix(doc: ComponentDoc, nodeId: string) {
  return `${scopeClass(doc)}-${nodeId}-`;
}

/** SVG : attributs de la racine du dessin, accessibilité et contenu en JSX */
function svgExtra(ctx: Ctx, node: Node, indent: string): ElExtra {
  const p = prepareSvg(String(node.props.markup ?? ""));
  const label = node.texts.label;
  const a11y: [string, string][] = label?.expose || label?.value ? [["role", '"img"']] : [["aria-hidden", '"true"']];
  if (!p.tree) return { attrs: a11y, children: [`${indent}  {/* ${tr("Invalid SVG")} */}`] };
  const tree = scopeSvgIds(p.tree, svgIdPrefix(ctx.doc, node.id));
  return { attrs: [...tree.attrs.map(([k, v]) => jsxAttrPair(k, v)), ...a11y], children: svgChildrenToJsx(tree.children, indent + "  ") };
}

function mergeImports(specs: ImportSpec[], used: Set<string>): string[] {
  const named = new Map<string, Set<string>>();
  const defaults = new Map<string, string>();
  for (const s of specs) {
    if ("default" in s) {
      if (used.has(s.default)) defaults.set(s.from, s.default);
      continue;
    }
    for (const n of s.named) {
      const local = Array.isArray(n) ? n[1] : n;
      if (!used.has(local)) continue;
      const txt = Array.isArray(n) ? `${n[0]} as ${n[1]}` : n;
      if (!named.has(s.from)) named.set(s.from, new Set());
      named.get(s.from)!.add(txt);
    }
  }
  const sources = [...new Set([...named.keys(), ...defaults.keys()])].sort((a, b) => {
    const ra = a.startsWith("."), rb = b.startsWith(".");
    return ra === rb ? a.localeCompare(b) : ra ? 1 : -1;
  });
  return sources.map((from) => {
    const d = defaults.get(from);
    const n = named.get(from);
    const parts = [d, n && n.size ? `{ ${[...n].sort().join(", ")} }` : undefined].filter(Boolean);
    return `import ${parts.join(", ")} from ${jsString(from)};`;
  });
}

function propType(field: PropField): string {
  if (field.type === "enum") return field.options.map((o) => jsString(o.value)).join(" | ");
  if (field.type === "boolean") return "boolean";
  if (field.type === "number") return "number";
  return "string";
}

export function collectProps(doc: ComponentDoc): PropDoc[] {
  const props: PropDoc[] = [];
  walk(doc, (n) => {
    const brick = findBrick(n.brick);
    if (!brick) return;
    for (const tf of brick.texts) {
      const b = n.texts[tf.key];
      if (!b?.expose) continue;
      props.push({
        name: b.propName,
        type: tf.kind === "list" ? "string[]" : "string",
        comment: `${tr(tf.label)} — ${translateNodeName(getLocale(), n.name)}`,
        defaultValue: jsLiteral(tf.kind === "list" ? (Array.isArray(b.value) ? b.value : [b.value]) : String(b.value)),
      });
    }
  });
  for (const e of doc.exposedProps) {
    const n = doc.nodes[e.nodeId];
    const brick = n && findBrick(n.brick);
    const field = brick?.props[e.prop];
    if (!n || !field) continue;
    props.push({ name: e.propName, type: propType(field), comment: `${tr(field.label)} — ${translateNodeName(getLocale(), n.name)}`, defaultValue: jsLiteral(n.props[e.prop]) });
  }
  for (const e of doc.theme.exposed) {
    props.push({ name: e.propName, type: "string", comment: tr("Color “{token}” (any CSS color), overrides the theme token", { token: e.token }) });
  }
  props.push({ name: "colorScheme", type: `"light" | "dark" | "auto"`, comment: tr("Color scheme (auto = system preference)"), defaultValue: jsString(doc.theme.defaultScheme) });
  props.push({ name: "className", type: "string", comment: tr("Additional CSS classes on the root element") });
  return props;
}

export function generateTsx(doc: ComponentDoc): GenResult {
  const componentName = toPascal(doc.name);
  const scope = scopeClass(doc);
  const ctx: Ctx = {
    doc,
    scope,
    used: new Set(),
    exposedProp: new Map(doc.exposedProps.map((e) => [`${e.nodeId}.${e.prop}`, e.propName])),
    vendored: new Set(),
    npm: new Set(),
    usesCn: false,
  };

  const root = doc.nodes[doc.rootId];
  const jsx = root ? emitNode(ctx, root, "    ") : ["    null"];

  // États contrôlés et effets
  const stateLines: string[] = [];
  const effectLines: string[] = [];
  let usesShortcut = false;
  walk(doc, (n) => {
    const brick = findBrick(n.brick);
    if (!brick) return;
    if (brick.effect?.kind === "hotkey" && brick.effect.action === "focus") {
      stateLines.push(`  const ${inputRefName(n)} = React.useRef<HTMLInputElement>(null);`);
    }
    const names = stateNames(n, brick) ?? { value: "", setter: "" };
    if (!brick.state) {
      // pas d'état contrôlé
    } else if (brick.state.kind === "open") {
      stateLines.push(`  const [${names.value}, ${names.setter}] = React.useState(${n.props[brick.state.initialProp] === true});`);
    } else {
      const animate = brick.effect?.kind === "animateValue" && n.props.animateOnMount === true && brick.state.fromProp;
      const initial = animate ? n.props[brick.state.fromProp!] : n.props[brick.state.initialProp];
      stateLines.push(`  const [${names.value}, ${names.setter}] = React.useState(${Number(initial) || 0});`);
    }
    if (brick.effect?.kind === "hotkey") {
      const eff = brick.effect;
      const exp = (prop: string) => ctx.exposedProp.get(`${n.id}.${prop}`);
      const enableExpr = exp(eff.enableProp);
      const shortcutExpr = exp(eff.shortcutProp) ?? jsString(String(n.props[eff.shortcutProp] ?? "mod+k"));
      if (enableExpr || n.props[eff.enableProp] !== false) {
        usesShortcut = true;
        const deps = [enableExpr, exp(eff.shortcutProp)].filter(Boolean).join(", ");
        effectLines.push(
          [
            `  React.useEffect(() => {`,
            ...(enableExpr ? [`    if (!${enableExpr}) return;`] : []),
            `    const onKeyDown = (e: KeyboardEvent) => {`,
            `      if (matchesShortcut(e, ${shortcutExpr})) {`,
            `        e.preventDefault();`,
            eff.action === "toggle" ? `        ${names.setter}((v) => !v);` : `        ${inputRefName(n)}.current?.focus();`,
            `      }`,
            `    };`,
            `    document.addEventListener("keydown", onKeyDown);`,
            `    return () => document.removeEventListener("keydown", onKeyDown);`,
            `  }, [${deps}]);`,
          ].join("\n"),
        );
      }
    }
    if (brick.effect?.kind === "animateValue" && brick.state && n.props.animateOnMount === true) {
      effectLines.push(
        [
          `  React.useEffect(() => {`,
          `    const timer = window.setTimeout(() => ${names.setter}(${Number(n.props[brick.state.initialProp]) || 0}), ${brick.effect.delayMs});`,
          `    return () => window.clearTimeout(timer);`,
          `  }, []);`,
        ].join("\n"),
      );
    }
  });

  const props = collectProps(doc);
  const allSpecs: ImportSpec[] = [];
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    if (b) allSpecs.push(...b.imports);
  });
  if (ctx.usesCn) {
    allSpecs.push({ from: "cn", named: ["cn"] });
    ctx.used.add("cn");
    ctx.npm.add("cn");
  }
  const imports = [...mergeImports(allSpecs, ctx.used), ...(doc.preservedImports ?? [])];
  const moduleCode = [...(usesShortcut ? [SHORTCUT_HELPER_SOURCE] : []), ...(doc.preservedCode?.module ?? [])];
  const bodyCode = (doc.preservedCode?.body ?? []).map((b) => b.split("\n").map((l) => `  ${l}`).join("\n"));

  const iface = [
    `export interface ${componentName}Props {`,
    ...props.flatMap((p) => [`  /** ${p.comment}${p.defaultValue ? ` (${tr("default: {value}", { value: p.defaultValue.length > 60 ? p.defaultValue.slice(0, 57) + "…" : p.defaultValue })})` : ""} */`, `  ${p.name}?: ${p.type};`]),
    `}`,
  ];
  const destructure = props.map((p) => `  ${p.name}${p.defaultValue !== undefined ? ` = ${p.defaultValue}` : ""},`);
  const styleVars = doc.theme.exposed.map((e) => `${jsString(`--${e.token}`)}: ${e.propName}`);

  const lines = [
    `"use client";`,
    ``,
    `import * as React from "react";`,
    ...imports,
    `import "./styles.css";`,
    ``,
    ...iface,
    ``,
    ...moduleCode.flatMap((c) => [c, ``]),
    `export default function ${componentName}({`,
    ...destructure,
    `}: ${componentName}Props) {`,
    ...stateLines,
    ...(effectLines.length ? ["", ...effectLines.flatMap((e) => [e, ""]).slice(0, -1)] : []),
    ...(stateLines.length || effectLines.length ? [""] : []),
    ...(bodyCode.length ? [...bodyCode, ""] : []),
    `  const scopeClassName = [${jsString(scope)}, colorScheme, className].filter(Boolean).join(" ");`,
    `  const scopeStyle = { ${styleVars.join(", ")} } as React.CSSProperties;`,
    ``,
    `  return (`,
    ...jsx,
    `  );`,
    `}`,
    ``,
  ];

  const firstText = props.find((p) => p.type === "string" && p.defaultValue);
  const usageCustom = firstText ? `<${componentName} ${firstText.name}=${jsString("Votre texte")} />` : `<${componentName} />`;

  return {
    code: lines.join("\n"),
    componentName,
    npm: [...ctx.npm],
    vendored: [...ctx.vendored],
    usage: `<${componentName} />`,
    usageCustom,
    props,
  };
}
