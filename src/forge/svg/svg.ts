/**
 * SVG intégré aux composants (brique html.svg) : analyse, nettoyage, sérialisation et conversion JSX.
 *
 * Le balisage vient de sources non fiables (collé, fichier importé, spec d'un agent, lien /new) et finit
 * dans le DOM du studio et dans le code exporté. Il est donc analysé (petit parseur XML, sans DOM) puis
 * reconstruit à partir d'une liste blanche :
 *  - éléments graphiques, dégradés, motifs, masques, filtres, textes, <use>, animations SMIL sûres ;
 *  - jamais de <script>, <foreignObject>, <style>, <iframe>, ni d'attribut on*, ni de lien externe
 *    (href ou url() vers autre chose qu'un #fragment ; seules les images data:image/png|jpeg|gif|webp) ;
 *  - les métadonnées d'éditeurs (Inkscape, Illustrator, Sketch…) disparaissent sans bruit.
 * Le résultat est un arbre canonique : même balisage → même arbre → même JSX, ce qui garantit
 * l'aller-retour codegen ↔ parseur.
 *
 * Module pur : utilisable dans le navigateur, les routes API, le serveur MCP et les tests.
 */

export type SvgEl = { tag: string; attrs: [string, string][]; children: SvgChild[] };
export type SvgChild = SvgEl | { text: string };

export type SvgIssueCode = "parse" | "root" | "size" | "element" | "attribute" | "url" | "viewBox";
export type SvgIssue = { code: SvgIssueCode; detail: string };

export type PreparedSvg = { tree: SvgEl | null; markup: string; issues: SvgIssue[] };

export const SVG_NS = "http://www.w3.org/2000/svg";
export const MAX_SVG_BYTES = 200_000;
const MAX_DEPTH = 64;
const MAX_ELEMENTS = 5000;

export const isSvgText = (c: SvgChild): c is { text: string } => "text" in c;

/* ——— Listes blanches ——— */

const ELEMENTS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc", "switch",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textPath",
  "linearGradient", "radialGradient", "stop", "pattern", "clipPath", "mask", "marker", "image",
  "filter", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting",
  "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR",
  "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight",
  "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence",
  "animate", "animateMotion", "animateTransform", "mpath",
]);

/** Éléments retirés sans avertissement (métadonnées d'éditeurs, contenu sans rendu) */
const SILENT_ELEMENTS = new Set(["metadata"]);

/** Éléments dont le contenu texte compte */
const TEXT_ELEMENTS = new Set(["text", "tspan", "textPath", "title", "desc"]);

/** Attributs SVG en kebab-case ↔ noms de props React (camelCase) */
const KEBAB_ATTRS = [
  "accent-height", "alignment-baseline", "arabic-form", "baseline-shift", "cap-height", "clip-path", "clip-rule",
  "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "dominant-baseline",
  "enable-background", "fill-opacity", "fill-rule", "flood-color", "flood-opacity", "font-family", "font-size",
  "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "glyph-name",
  "glyph-orientation-horizontal", "glyph-orientation-vertical", "horiz-adv-x", "horiz-origin-x", "image-rendering",
  "letter-spacing", "lighting-color", "marker-end", "marker-mid", "marker-start", "overline-position",
  "overline-thickness", "paint-order", "pointer-events", "rendering-intent", "shape-rendering", "stop-color",
  "stop-opacity", "strikethrough-position", "strikethrough-thickness", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke-width", "text-anchor",
  "text-decoration", "text-rendering", "transform-origin", "underline-position", "underline-thickness",
  "unicode-bidi", "unicode-range", "units-per-em", "v-alphabetic", "v-hanging", "v-ideographic", "v-mathematical",
  "vector-effect", "vert-adv-y", "vert-origin-x", "vert-origin-y", "word-spacing", "writing-mode", "x-height",
];
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const TO_JSX = new Map<string, string>([...KEBAB_ATTRS.map((a) => [a, camel(a)] as [string, string]), ["class", "className"]]);
const FROM_JSX = new Map<string, string>([...[...TO_JSX].map(([k, v]) => [v, k] as [string, string]), ["xlinkHref", "xlink:href"], ["xmlSpace", "xml:space"], ["xmlLang", "xml:lang"]]);

/** Nom d'attribut SVG → nom de prop JSX */
export const svgAttrToJsx = (name: string) => TO_JSX.get(name) ?? name;
/** Nom de prop JSX → nom d'attribut SVG */
export const jsxAttrToSvg = (name: string) => FROM_JSX.get(name) ?? name;

/** Attributs refusés quel que soit l'élément */
const BLOCKED_ATTRS = new Set(["src", "action", "formaction", "srcdoc", "tabindex", "autofocus", "contenteditable"]);

/** Attributs de l'élément racine gérés par la brique (taille par le style, accessibilité par le texte « label ») */
const ROOT_MANAGED = new Set(["width", "height", "x", "y", "class", "id", "role", "aria-label", "aria-labelledby", "aria-describedby", "aria-hidden", "focusable", "version", "baseProfile"]);

/* ——— Analyse XML ——— */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string, fail: (m: string) => never): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);?/g, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) fail(`invalid character reference ${m}`);
      return String.fromCodePoint(cp);
    }
    if (e in ENTITIES) return ENTITIES[e];
    return fail(`unknown entity &${e};`);
  });
}

class ParseError extends Error {}

/** Balisage → arbre brut (sans nettoyage). Lève ParseError. */
function parseXml(src: string): SvgEl[] {
  let i = 0;
  let count = 0;
  const fail = (m: string): never => {
    const line = src.slice(0, i).split("\n").length;
    throw new ParseError(`${m} (line ${line})`);
  };
  const roots: SvgEl[] = [];
  const stack: SvgEl[] = [];
  const push = (c: SvgChild) => {
    if (stack.length) stack[stack.length - 1].children.push(c);
    else if (!isSvgText(c)) roots.push(c);
    else if (c.text.trim()) fail("text outside the <svg> element");
  };
  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt === -1) {
      push({ text: decodeEntities(src.slice(i), fail) });
      break;
    }
    if (lt > i) push({ text: decodeEntities(src.slice(i, lt), fail) });
    i = lt;
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      if (end === -1) fail("unclosed comment");
      i = end + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", i)) {
      const end = src.indexOf("]]>", i + 9);
      if (end === -1) fail("unclosed CDATA section");
      if (stack.length) push({ text: src.slice(i + 9, end) });
      i = end + 3;
      continue;
    }
    if (src.startsWith("<?", i)) {
      const end = src.indexOf("?>", i + 2);
      if (end === -1) fail("unclosed processing instruction");
      i = end + 2;
      continue;
    }
    if (src.startsWith("<!", i)) {
      // <!DOCTYPE …> avec éventuel sous-ensemble interne […] : ignoré (les entités déclarées ne sont pas développées)
      let depth = 0;
      let j = i + 2;
      for (; j < src.length; j++) {
        if (src[j] === "[") depth++;
        else if (src[j] === "]") depth--;
        else if (src[j] === ">" && depth <= 0) break;
      }
      if (j >= src.length) fail("unclosed declaration");
      i = j + 1;
      continue;
    }
    if (src[i + 1] === "/") {
      const m = /^<\/([A-Za-z_][\w:.-]*)\s*>/.exec(src.slice(i, i + 300));
      if (!m) fail("malformed closing tag");
      const open = stack.pop();
      if (!open || open.tag !== m![1]) fail(`unexpected </${m![1]}>${open ? ` (expected </${open.tag}>)` : ""}`);
      i += m![0].length;
      continue;
    }
    const nm = /^<([A-Za-z_][\w:.-]*)/.exec(src.slice(i, i + 300));
    if (!nm) fail("malformed tag");
    const el: SvgEl = { tag: nm![1], attrs: [], children: [] };
    if (++count > MAX_ELEMENTS) fail(`more than ${MAX_ELEMENTS} elements`);
    i += nm![0].length;
    const seen = new Set<string>();
    for (;;) {
      const ws = /^\s*/.exec(src.slice(i, i + 1000))![0];
      i += ws.length;
      if (src.startsWith("/>", i)) {
        i += 2;
        push(el);
        break;
      }
      if (src[i] === ">") {
        i++;
        push(el);
        stack.push(el);
        if (stack.length > MAX_DEPTH) fail(`nesting deeper than ${MAX_DEPTH} levels`);
        break;
      }
      if (!ws && el.attrs.length) fail(`missing space between attributes of <${el.tag}>`);
      const am = /^([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(i, i + 1_000_000));
      if (!am) fail(`malformed attribute in <${el.tag}>`);
      const name = am![1];
      if (seen.has(name)) fail(`duplicate attribute ${name} on <${el.tag}>`);
      seen.add(name);
      el.attrs.push([name, decodeEntities(am![3] ?? am![4], fail)]);
      i += am![0].length;
    }
  }
  if (stack.length) fail(`unclosed <${stack[stack.length - 1].tag}>`);
  return roots;
}

/* ——— Nettoyage ——— */

const FRAGMENT_URL = /^url\(\s*(['"]?)#[\w.:-]+\1\s*\)$/;
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/;

/** Valeur dangereuse ou référence externe : renvoie la raison, sinon null */
function unsafeValue(v: string): string | null {
  const compact = v.replace(/[\s\u0000-\u001f]/g, "").toLowerCase();
  if (/(javascript|vbscript|data:text\/html|livescript):/.test(compact)) return v.slice(0, 60);
  if (/expression\(|@import|-moz-binding|behavior:/.test(compact)) return v.slice(0, 60);
  for (const m of v.matchAll(/url\([^)]*\)/gi)) if (!FRAGMENT_URL.test(m[0])) return m[0].slice(0, 80);
  return null;
}

function cleanStyle(style: string, issues: SvgIssue[]): string {
  const out: string[] = [];
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!/^(--)?[a-z][a-z0-9-]*$/.test(prop) || !value) continue;
    const bad = unsafeValue(value);
    if (bad) {
      issues.push({ code: "url", detail: bad });
      continue;
    }
    out.push(`${prop}: ${value}`);
  }
  return out.join("; ");
}

type CleanCtx = { issues: SvgIssue[] };

function cleanEl(ctx: CleanCtx, el: SvgEl, isRoot: boolean): SvgEl | SvgChild[] | null {
  const tag = el.tag;
  if (tag.includes(":") || SILENT_ELEMENTS.has(tag)) return null; // sodipodi:namedview, metadata…
  if (tag === "a") {
    // lien : remplacé par un groupe (le contenu reste, la navigation disparaît)
    ctx.issues.push({ code: "element", detail: "a" });
    return cleanEl(ctx, { ...el, tag: "g", attrs: el.attrs.filter(([n]) => !/(^|:)href$/.test(n) && n !== "target") }, false);
  }
  if (!ELEMENTS.has(tag)) {
    ctx.issues.push({ code: "element", detail: tag });
    return null;
  }
  const attrs: [string, string][] = [];
  for (const [rawName, rawValue] of el.attrs) {
    let name = rawName;
    let value = rawValue;
    if (name === "xlink:href") name = "href";
    if (name === "xmlns" || name.startsWith("xmlns:") || name.startsWith("xml:")) continue;
    if (name.includes(":")) continue; // attributs d'éditeurs (inkscape:label, sketch:type…)
    if (isRoot && ROOT_MANAGED.has(name)) continue;
    const lower = name.toLowerCase();
    if (lower.startsWith("on") || BLOCKED_ATTRS.has(lower) || !/^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
      ctx.issues.push({ code: "attribute", detail: `${name} (<${tag}>)` });
      continue;
    }
    // Animations : jamais sur un lien ou un gestionnaire d'événement
    if ((tag === "animate" || tag === "set" || tag === "animateTransform" || tag === "animateMotion") && lower === "attributename" && /^(href|xlink:href|on.*|style|class)$/i.test(value.trim())) {
      ctx.issues.push({ code: "attribute", detail: `${name}="${value}" (<${tag}>)` });
      return null;
    }
    if (name === "href") {
      const v = value.trim();
      const ok = /^#[\w.:-]+$/.test(v) || ((tag === "image" || tag === "feImage") && SAFE_DATA_IMAGE.test(v));
      if (!ok) {
        ctx.issues.push({ code: "url", detail: v.slice(0, 80) });
        continue;
      }
      value = v.replace(/\s+/g, "");
    } else if (name === "style") {
      value = cleanStyle(value, ctx.issues);
      if (!value) continue;
    } else {
      const bad = unsafeValue(value);
      if (bad) {
        ctx.issues.push({ code: "url", detail: bad });
        continue;
      }
    }
    attrs.push([name, value]);
  }
  if ((tag === "image" || tag === "feImage") && !attrs.some(([n]) => n === "href")) return null;
  const children: SvgChild[] = [];
  const keepText = TEXT_ELEMENTS.has(tag);
  for (const c of el.children) {
    if (isSvgText(c)) {
      if (keepText) children.push({ text: c.text.replace(/\s+/g, " ") });
      continue;
    }
    const r = cleanEl(ctx, c, false);
    if (Array.isArray(r)) children.push(...r);
    else if (r) children.push(r);
  }
  // Textes : fusion des morceaux adjacents, espaces de début et de fin rognés, blancs isolés en bord retirés
  const merged: SvgChild[] = [];
  for (const c of children) {
    const last = merged[merged.length - 1];
    if (isSvgText(c) && last && isSvgText(last)) last.text = (last.text + c.text).replace(/\s+/g, " ");
    else merged.push(c);
  }
  if (keepText && merged.length) {
    const first = merged[0];
    const last = merged[merged.length - 1];
    if (isSvgText(first)) first.text = first.text.replace(/^\s+/, "");
    if (isSvgText(last)) last.text = last.text.replace(/\s+$/, "");
  }
  return { tag, attrs, children: merged.filter((c) => !isSvgText(c) || c.text !== "") };
}

/** Taille déclarée (width/height) → viewBox, puisque la taille est pilotée par le style de la brique */
function rootViewBox(el: SvgEl): string | null {
  const get = (n: string) => el.attrs.find(([k]) => k === n)?.[1];
  if (get("viewBox")) return null;
  const w = parseFloat(get("width") ?? "");
  const h = parseFloat(get("height") ?? "");
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? `0 0 ${w} ${h}` : null;
}

/* ——— Sérialisation ——— */

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function serializeEl(el: SvgEl, indent: string, root: boolean): string {
  const attrs = (root ? [["xmlns", SVG_NS] as [string, string], ...el.attrs] : el.attrs).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join("");
  if (!el.children.length) return `${indent}<${el.tag}${attrs}/>`;
  if (el.children.some(isSvgText)) {
    // contenu mixte : sur une ligne (les espaces comptent)
    const inline = (c: SvgChild): string => (isSvgText(c) ? escText(c.text) : serializeEl(c, "", false));
    return `${indent}<${el.tag}${attrs}>${el.children.map(inline).join("")}</${el.tag}>`;
  }
  return [`${indent}<${el.tag}${attrs}>`, ...el.children.map((c) => serializeEl(c as SvgEl, indent + "  ", false)), `${indent}</${el.tag}>`].join("\n");
}

/** Arbre → balisage canonique (fichier .svg autonome, avec xmlns) */
export function serializeSvg(tree: SvgEl): string {
  return serializeEl(tree, "", true);
}

/* ——— Point d'entrée ——— */

const cache = new Map<string, PreparedSvg>();

function prepareUncached(markup: string): PreparedSvg {
  const issues: SvgIssue[] = [];
  const fail = (code: SvgIssueCode, detail: string): PreparedSvg => ({ tree: null, markup, issues: [{ code, detail }] });
  if (markup.length > MAX_SVG_BYTES) return fail("size", `${MAX_SVG_BYTES / 1000} KB`);
  let roots: SvgEl[];
  try {
    roots = parseXml(markup.replace(/^﻿/, ""));
  } catch (e) {
    return fail("parse", e instanceof Error ? e.message : String(e));
  }
  if (roots.length !== 1 || roots[0].tag !== "svg") return fail("root", roots.map((r) => `<${r.tag}>`).join(", ") || "empty");
  const raw = roots[0];
  const vb = rootViewBox(raw);
  const tree = cleanEl({ issues }, raw, true) as SvgEl;
  if (vb) tree.attrs.unshift(["viewBox", vb]);
  if (!tree.attrs.some(([k]) => k === "viewBox")) issues.push({ code: "viewBox", detail: "" });
  return { tree, markup: serializeSvg(tree), issues };
}

/** Balisage quelconque → arbre nettoyé + balisage canonique + problèmes rencontrés (mis en cache) */
export function prepareSvg(markup: string): PreparedSvg {
  const hit = cache.get(markup);
  if (hit) return hit;
  const r = prepareUncached(markup);
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(markup, r);
  return r;
}

/** Problème bloquant : le balisage n'est pas utilisable */
export const isFatal = (i: SvgIssue) => i.code === "parse" || i.code === "root" || i.code === "size";
/** Contenu retiré par le nettoyage (pour l'utilisateur, ou erreur stricte pour une spec) */
export const isRemoval = (i: SvgIssue) => i.code === "element" || i.code === "attribute" || i.code === "url";

/** Message anglais (agents, API) */
export function svgIssueMessage(i: SvgIssue): string {
  switch (i.code) {
    case "parse":
      return `invalid SVG: ${i.detail}`;
    case "root":
      return `the markup must contain exactly one <svg> root element (found: ${i.detail})`;
    case "size":
      return `SVG too large (max ${i.detail})`;
    case "element":
      return `<${i.detail}> is not allowed (no scripts, foreignObject, style elements, links or unknown elements)`;
    case "attribute":
      return `attribute ${i.detail} is not allowed (no event handlers)`;
    case "url":
      return `external reference not allowed: ${i.detail} (only #fragment references and data:image/png|jpeg|gif|webp images)`;
    case "viewBox":
      return "no viewBox: add one so the drawing scales with its width";
  }
}

/* ——— Identifiants (dégradés, masques…) uniques par composant ——— */

const ID_REF_ATTRS = new Set(["href"]);

function mapIds(tree: SvgEl, rename: (id: string) => string | null): SvgEl {
  const ids = new Set<string>();
  const collect = (el: SvgEl) => {
    for (const [k, v] of el.attrs) if (k === "id") ids.add(v);
    el.children.forEach((c) => !isSvgText(c) && collect(c));
  };
  collect(tree);
  if (!ids.size) return tree;
  const ref = (id: string) => (ids.has(id) ? (rename(id) ?? id) : id);
  const fixValue = (k: string, v: string) => {
    if (k === "id") return ref(v);
    if (ID_REF_ATTRS.has(k) && v.startsWith("#")) return `#${ref(v.slice(1))}`;
    let out = v.replace(/url\(\s*(['"]?)#([\w.:-]+)\1\s*\)/g, (_m, q: string, id: string) => `url(${q}#${ref(id)}${q})`);
    // begin="anim1.end" (animations SMIL)
    if (k === "begin" || k === "end") out = out.replace(/(^|;\s*)([\w-]+)\./g, (m, sep: string, id: string) => (ids.has(id) ? `${sep}${ref(id)}.` : m));
    return out;
  };
  const walk = (el: SvgEl): SvgEl => ({ tag: el.tag, attrs: el.attrs.map(([k, v]) => [k, fixValue(k, v)]), children: el.children.map((c) => (isSvgText(c) ? c : walk(c))) });
  return walk(tree);
}

/** Préfixe les identifiants internes (évite les collisions entre deux SVG d'une même page) */
export function scopeSvgIds(tree: SvgEl, prefix: string): SvgEl {
  return mapIds(tree, (id) => `${prefix}${id}`);
}

/** Retire un préfixe ajouté par scopeSvgIds (relecture du code généré) */
export function unscopeSvgIds(tree: SvgEl, prefix: RegExp): SvgEl {
  return mapIds(tree, (id) => {
    const m = prefix.exec(id);
    return m && m.index === 0 && id.length > m[0].length ? id.slice(m[0].length) : null;
  });
}

/* ——— Recoloration : les couleurs suivent la couleur du texte (style « fg ») ——— */

const PAINT_ATTRS = new Set(["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"]);
const KEEP_PAINT = /^(none|transparent|currentcolor|inherit|context-fill|context-stroke|url\(.*\))$/i;

/** Remplace les couleurs de remplissage et de contour par currentColor */
export function recolorSvg(tree: SvgEl): SvgEl {
  const paint = (v: string) => (KEEP_PAINT.test(v.trim()) ? v : "currentColor");
  const walk = (el: SvgEl): SvgEl => ({
    tag: el.tag,
    attrs: el.attrs.map(([k, v]): [string, string] => {
      if (PAINT_ATTRS.has(k)) return [k, paint(v)];
      if (k === "style") return [k, v.split(";").map((d) => {
        const idx = d.indexOf(":");
        if (idx === -1) return d;
        const p = d.slice(0, idx).trim();
        return PAINT_ATTRS.has(p) ? `${p}: ${paint(d.slice(idx + 1).trim())}` : d.trim();
      }).filter(Boolean).join("; ")];
      return [k, v];
    }),
    children: el.children.map((c) => (isSvgText(c) ? c : walk(c))),
  });
  return walk(tree);
}

/* ——— Conversion JSX ——— */

/** Déclarations CSS → objet style React (clés camelCase, variables conservées) */
export function styleToObject(style: string): [string, string][] {
  return style
    .split(";")
    .map((d) => {
      const idx = d.indexOf(":");
      if (idx === -1) return null;
      const prop = d.slice(0, idx).trim();
      const value = d.slice(idx + 1).trim();
      if (!prop || !value) return null;
      return [prop.startsWith("--") ? prop : camel(prop.replace(/^-ms-/, "ms-")), value] as [string, string];
    })
    .filter((x): x is [string, string] => !!x);
}

/** Objet style React → déclarations CSS */
export function objectToStyle(entries: [string, string][]): string {
  return entries.map(([k, v]) => `${k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^ms-/, "-ms-")}: ${v}`).join("; ");
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function jsxAttrValue(v: string): string {
  return /^[^"&{}<>\n\\]*$/.test(v) ? `"${v}"` : `{${JSON.stringify(v)}}`;
}

/** Attribut SVG → [nom JSX, valeur JSX] */
export function jsxAttrPair(name: string, value: string): [string, string] {
  if (name === "style") {
    const obj = styleToObject(value);
    return ["style", `{{ ${obj.map(([k, v]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }}`];
  }
  return [svgAttrToJsx(name), jsxAttrValue(value)];
}

function jsxTextChild(s: string): string {
  return /^[^{}<>&\n]*$/.test(s) && s.trim() === s && !/\s{2,}/.test(s) && s !== "" ? s : `{${JSON.stringify(s)}}`;
}

/** Enfants d'un élément SVG → lignes JSX indentées */
export function svgChildrenToJsx(children: SvgChild[], indent: string): string[] {
  const out: string[] = [];
  for (const c of children) {
    if (isSvgText(c)) {
      out.push(indent + jsxTextChild(c.text));
      continue;
    }
    const attrs = c.attrs.map(([k, v]) => jsxAttrPair(k, v).join("="));
    const open = `${indent}<${c.tag}${attrs.length ? " " + attrs.join(" ") : ""}`;
    if (!c.children.length) out.push(`${open} />`);
    else if (c.children.length === 1 && isSvgText(c.children[0]) && open.length < 100) out.push(`${open}>${jsxTextChild(c.children[0].text)}</${c.tag}>`);
    else out.push(`${open}>`, ...svgChildrenToJsx(c.children, indent + "  "), `${indent}</${c.tag}>`);
  }
  return out;
}

/** Attributs SVG → props React (rendu dans le studio et pour l'export Web Component) */
export function svgAttrsToReact(attrs: [string, string][]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of attrs) {
    if (k === "style") out.style = Object.fromEntries(styleToObject(v));
    else out[svgAttrToJsx(k)] = v;
  }
  return out;
}
