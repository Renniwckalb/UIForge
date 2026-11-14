/**
 * Modèle du dessin vectoriel et sérialisation SVG.
 * Une seule source : le canvas de l'éditeur affiche exactement le balisage produit ici
 * (avec quelques attributs d'édition en plus), et l'onglet Code montre le même balisage.
 * Fichier pur (pas de DOM) : testable côté Node.
 */

export const SHAPE_TYPES = [
  "pencil",
  "line",
  "arrow",
  "rect",
  "square",
  "roundrect",
  "circle",
  "ellipse",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "star",
  "heart",
  "text",
] as const;
export type ShapeType = (typeof SHAPE_TYPES)[number];

export type Dash = "solid" | "dashed" | "dotted";

export type Shape = {
  id: string;
  type: ShapeType;
  /** Boîte englobante. Pour line/arrow : (x, y) = début, (x + w, y + h) = fin (w/h peuvent être négatifs). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tracé libre : points relatifs à la boîte (0..1), pour un redimensionnement simple */
  points?: [number, number][];
  text?: string;
  stroke: string;
  fill: string; // "none" = sans remplissage
  strokeWidth: number;
  opacity: number; // 0..1
  dash: Dash;
  radius?: number; // roundrect
  fontSize?: number; // text
  fontFamily?: string;
};

export type Drawing = {
  width: number;
  height: number;
  background: string; // "none" = transparent
  shapes: Shape[];
};

export type Style = Pick<Shape, "stroke" | "fill" | "strokeWidth" | "opacity" | "dash"> & { radius: number; fontSize: number; fontFamily: string };

export const DEFAULT_STYLE: Style = {
  stroke: "#18181b",
  fill: "none",
  strokeWidth: 3,
  opacity: 1,
  dash: "solid",
  radius: 16,
  fontSize: 32,
  fontFamily: "system-ui, sans-serif",
};

export const isLinear = (t: ShapeType) => t === "line" || t === "arrow";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Boîte normalisée (largeur/hauteur positives) */
export function normBox(s: Pick<Shape, "x" | "y" | "w" | "h">) {
  return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
}

/** Approximation de la boîte d'un texte (sans mesure DOM) */
export function textBox(s: Shape) {
  const size = s.fontSize ?? DEFAULT_STYLE.fontSize;
  const lines = (s.text ?? "").split("\n");
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { x: s.x, y: s.y, w: longest * size * 0.56, h: lines.length * size * 1.2 };
}

export function bbox(s: Shape) {
  if (s.type === "text") return textBox(s);
  return normBox(s);
}

function polygonPoints(cx: number, cy: number, rx: number, ry: number, n: number, rotation = -Math.PI / 2) {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = rotation + (i * 2 * Math.PI) / n;
    pts.push(`${r2(cx + rx * Math.cos(a))},${r2(cy + ry * Math.sin(a))}`);
  }
  return pts.join(" ");
}

function starPoints(cx: number, cy: number, rx: number, ry: number, n = 5, inner = 0.45) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const k = i % 2 ? inner : 1;
    pts.push(`${r2(cx + rx * k * Math.cos(a))},${r2(cy + ry * k * Math.sin(a))}`);
  }
  return pts.join(" ");
}

function heartPath(x: number, y: number, w: number, h: number) {
  const p = (px: number, py: number) => `${r2(x + px * w)} ${r2(y + py * h)}`;
  return [
    `M ${p(0.5, 0.25)}`,
    `C ${p(0.5, 0.1)}, ${p(0.38, 0)}, ${p(0.25, 0)}`,
    `C ${p(0.1, 0)}, ${p(0, 0.13)}, ${p(0, 0.3)}`,
    `C ${p(0, 0.55)}, ${p(0.25, 0.75)}, ${p(0.5, 1)}`,
    `C ${p(0.75, 0.75)}, ${p(1, 0.55)}, ${p(1, 0.3)}`,
    `C ${p(1, 0.13)}, ${p(0.9, 0)}, ${p(0.75, 0)}`,
    `C ${p(0.62, 0)}, ${p(0.5, 0.1)}, ${p(0.5, 0.25)}`,
    "Z",
  ].join(" ");
}

/** Tracé lissé (courbes quadratiques entre les milieux des points) */
export function smoothPath(pts: [number, number][]): string {
  if (!pts.length) return "";
  if (pts.length < 3) return `M ${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(" L ")}`;
  let d = `M ${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q ${r2(x)} ${r2(y)} ${r2((x + nx) / 2)} ${r2((y + ny) / 2)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${r2(last[0])} ${r2(last[1])}`;
}

export type SvgNode = { tag: string; attrs: Record<string, string | number>; text?: string; children?: SvgNode[] };

function dashArray(s: Shape): string | undefined {
  if (s.dash === "dashed") return `${r2(s.strokeWidth * 3)} ${r2(s.strokeWidth * 2)}`;
  if (s.dash === "dotted") return `0 ${r2(s.strokeWidth * 2)}`;
  return undefined;
}

function paint(s: Shape, filled = true): Record<string, string | number> {
  const a: Record<string, string | number> = {
    fill: filled ? s.fill : "none",
    stroke: s.stroke,
    "stroke-width": s.strokeWidth,
  };
  const d = dashArray(s);
  if (d) a["stroke-dasharray"] = d;
  if (s.dash === "dotted" || s.type === "pencil" || isLinear(s.type)) a["stroke-linecap"] = "round";
  if (s.type === "pencil" || s.type === "star" || s.type === "triangle" || s.type === "diamond") a["stroke-linejoin"] = "round";
  if (s.opacity < 1) a.opacity = r2(s.opacity);
  return a;
}

/** Shape → élément SVG */
export function shapeNode(s: Shape): SvgNode {
  const { x, y, w, h } = normBox(s);
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (s.type) {
    case "line":
      return { tag: "line", attrs: { x1: r2(s.x), y1: r2(s.y), x2: r2(s.x + s.w), y2: r2(s.y + s.h), ...paint(s, false) } };
    case "arrow": {
      const x2 = s.x + s.w;
      const y2 = s.y + s.h;
      const ang = Math.atan2(s.h, s.w);
      const len = Math.max(10, s.strokeWidth * 4);
      const a1 = ang + Math.PI - Math.PI / 7;
      const a2 = ang + Math.PI + Math.PI / 7;
      const head = `${r2(x2)},${r2(y2)} ${r2(x2 + len * Math.cos(a1))},${r2(y2 + len * Math.sin(a1))} ${r2(x2 + len * Math.cos(a2))},${r2(y2 + len * Math.sin(a2))}`;
      // la ligne s'arrête à la base de la pointe pour ne pas dépasser
      const bx = x2 - len * 0.8 * Math.cos(ang);
      const by = y2 - len * 0.8 * Math.sin(ang);
      const g: Record<string, string | number> = {};
      if (s.opacity < 1) g.opacity = r2(s.opacity);
      const p = paint(s, false);
      delete p.opacity;
      return {
        tag: "g",
        attrs: g,
        children: [
          { tag: "line", attrs: { x1: r2(s.x), y1: r2(s.y), x2: r2(bx), y2: r2(by), ...p } },
          { tag: "polygon", attrs: { points: head, fill: s.stroke, stroke: s.stroke, "stroke-width": r2(Math.max(1, s.strokeWidth / 2)), "stroke-linejoin": "round" } },
        ],
      };
    }
    case "rect":
    case "square":
      return { tag: "rect", attrs: { x: r2(x), y: r2(y), width: r2(w), height: r2(h), ...paint(s) } };
    case "roundrect": {
      const rx = r2(Math.min(s.radius ?? DEFAULT_STYLE.radius, w / 2, h / 2));
      return { tag: "rect", attrs: { x: r2(x), y: r2(y), width: r2(w), height: r2(h), rx, ry: rx, ...paint(s) } };
    }
    case "circle":
      return { tag: "circle", attrs: { cx: r2(cx), cy: r2(cy), r: r2(Math.min(w, h) / 2), ...paint(s) } };
    case "ellipse":
      return { tag: "ellipse", attrs: { cx: r2(cx), cy: r2(cy), rx: r2(w / 2), ry: r2(h / 2), ...paint(s) } };
    case "triangle":
      return { tag: "polygon", attrs: { points: `${r2(cx)},${r2(y)} ${r2(x + w)},${r2(y + h)} ${r2(x)},${r2(y + h)}`, ...paint(s) } };
    case "diamond":
      return { tag: "polygon", attrs: { points: `${r2(cx)},${r2(y)} ${r2(x + w)},${r2(cy)} ${r2(cx)},${r2(y + h)} ${r2(x)},${r2(cy)}`, ...paint(s) } };
    case "pentagon":
      return { tag: "polygon", attrs: { points: polygonPoints(cx, cy, w / 2, h / 2, 5), ...paint(s) } };
    case "hexagon":
      return { tag: "polygon", attrs: { points: polygonPoints(cx, cy, w / 2, h / 2, 6, 0), ...paint(s) } };
    case "star":
      return { tag: "polygon", attrs: { points: starPoints(cx, cy, w / 2, h / 2), ...paint(s) } };
    case "heart":
      return { tag: "path", attrs: { d: heartPath(x, y, w, h), ...paint(s) } };
    case "pencil": {
      const pts = (s.points ?? []).map(([px, py]) => [x + px * w, y + py * h] as [number, number]);
      return { tag: "path", attrs: { d: smoothPath(pts), ...paint(s, false) } };
    }
    case "text": {
      const size = s.fontSize ?? DEFAULT_STYLE.fontSize;
      const lines = (s.text ?? "").split("\n");
      const a: Record<string, string | number> = {
        x: r2(s.x),
        y: r2(s.y + size),
        "font-family": s.fontFamily ?? DEFAULT_STYLE.fontFamily,
        "font-size": size,
        fill: s.fill === "none" ? s.stroke : s.fill,
      };
      if (s.fill !== "none" && s.strokeWidth > 0 && s.stroke !== s.fill) {
        a.stroke = s.stroke;
        a["stroke-width"] = r2(Math.min(s.strokeWidth, size / 8));
        a["paint-order"] = "stroke";
      }
      if (s.opacity < 1) a.opacity = r2(s.opacity);
      if (lines.length === 1) return { tag: "text", attrs: a, text: lines[0] };
      return {
        tag: "text",
        attrs: a,
        children: lines.map((l, i) => ({ tag: "tspan", attrs: { x: r2(s.x), dy: i === 0 ? 0 : r2(size * 1.2) }, text: l })),
      };
    }
  }
}

export function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function nodeToString(n: SvgNode, indent = "  ", extra?: Record<string, string>): string {
  const attrs = Object.entries({ ...n.attrs, ...extra })
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join("");
  if (n.children?.length) {
    const inner = n.children.map((c) => nodeToString(c, indent + "  ")).join("\n");
    return `${indent}<${n.tag}${attrs}>\n${inner}\n${indent}</${n.tag}>`;
  }
  if (n.text !== undefined) return `${indent}<${n.tag}${attrs}>${escapeXml(n.text)}</${n.tag}>`;
  return `${indent}<${n.tag}${attrs}/>`;
}

/** Shape « vide » (créée par un simple clic) : ignorée */
export function isDegenerate(s: Shape) {
  if (s.type === "text") return !(s.text ?? "").trim();
  if (s.type === "pencil") return (s.points?.length ?? 0) < 2;
  return Math.abs(s.w) < 2 && Math.abs(s.h) < 2;
}

export function contentBox(shapes: Shape[], pad = 0) {
  if (!shapes.length) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const s of shapes) {
    const b = bbox(s);
    const half = s.type === "text" ? 0 : s.strokeWidth / 2 + (s.type === "arrow" ? s.strokeWidth * 4 : 0);
    x1 = Math.min(x1, b.x - half);
    y1 = Math.min(y1, b.y - half);
    x2 = Math.max(x2, b.x + b.w + half);
    y2 = Math.max(y2, b.y + b.h + half);
  }
  return { x: r2(x1 - pad), y: r2(y1 - pad), w: r2(x2 - x1 + pad * 2), h: r2(y2 - y1 + pad * 2) };
}

export type SvgOptions = { crop?: boolean; padding?: number };

/** Document SVG complet (code affiché et fichier téléchargé) */
export function toSvg(d: Drawing, opts: SvgOptions = {}): string {
  const box = opts.crop ? contentBox(d.shapes, opts.padding ?? 8) : null;
  const vb = box ?? { x: 0, y: 0, w: d.width, h: d.height };
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${vb.w}" height="${vb.h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">`];
  if (d.background !== "none") lines.push(`  <rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${escapeXml(d.background)}"/>`);
  for (const s of d.shapes) lines.push(nodeToString(shapeNode(s)));
  lines.push("</svg>");
  return lines.join("\n") + "\n";
}

/** Balisage du canvas d'édition : mêmes éléments + data-shape-id et zone de clic élargie */
export function editorMarkup(shapes: Shape[]): string {
  return shapes
    .map((s) => {
      const node = shapeNode(s);
      const hit = Math.max(12, s.strokeWidth + 8);
      const thin = s.type === "pencil" || isLinear(s.type);
      const helper = thin
        ? nodeToString(
            { tag: s.type === "pencil" ? "path" : "line", attrs: s.type === "pencil" ? { d: String(node.attrs.d) } : { x1: s.x, y1: s.y, x2: s.x + s.w, y2: s.y + s.h } },
            "",
            { stroke: "transparent", "stroke-width": String(hit), fill: "none", "stroke-linecap": "round" },
          )
        : "";
      return `<g data-shape-id="${escapeXml(s.id)}" pointer-events="${thin ? "visibleStroke" : "all"}">${nodeToString(node, "")}${helper}</g>`;
    })
    .join("");
}

/** Redimensionne une forme selon la poignée déplacée (coin opposé fixe) */
export type Handle = "nw" | "ne" | "sw" | "se" | "start" | "end";

export function resizeShape(orig: Shape, handle: Handle, px: number, py: number, keepRatio: boolean): Shape {
  if (handle === "start") return { ...orig, x: px, y: py, w: orig.x + orig.w - px, h: orig.y + orig.h - py };
  if (handle === "end") return { ...orig, w: px - orig.x, h: py - orig.y };
  if (orig.type === "text") {
    const b = textBox(orig);
    const fx = handle.includes("w") ? b.x + b.w : b.x;
    const scale = Math.max(0.1, Math.abs(px - fx) / Math.max(1, b.w));
    const fontSize = Math.max(6, Math.round((orig.fontSize ?? DEFAULT_STYLE.fontSize) * scale));
    const nb = textBox({ ...orig, fontSize });
    return { ...orig, fontSize, x: handle.includes("w") ? fx - nb.w : fx, y: handle.includes("n") ? b.y + b.h - nb.h : b.y };
  }
  const b = normBox(orig);
  const fx = handle.includes("w") ? b.x + b.w : b.x;
  const fy = handle.includes("n") ? b.y + b.h : b.y;
  let w = px - fx;
  let h = py - fy;
  if (keepRatio || orig.type === "square" || orig.type === "circle") {
    const ratio = b.h ? b.w / b.h : 1;
    const m = Math.max(Math.abs(w), Math.abs(h) * ratio);
    w = Math.sign(w || 1) * m;
    h = Math.sign(h || 1) * (m / ratio);
  }
  const nb = normBox({ x: fx, y: fy, w, h });
  return { ...orig, ...nb };
}

/** Contrainte pendant le tracé : carré, cercle, Maj = proportions 1:1 / angle à 15° */
export function constrainDraw(type: ShapeType, w: number, h: number, shift: boolean): [number, number] {
  if (isLinear(type)) {
    if (!shift) return [w, h];
    const len = Math.hypot(w, h);
    const step = Math.PI / 12;
    const a = Math.round(Math.atan2(h, w) / step) * step;
    return [len * Math.cos(a), len * Math.sin(a)];
  }
  if (type === "square" || type === "circle" || shift) {
    const m = Math.max(Math.abs(w), Math.abs(h));
    return [Math.sign(w || 1) * m, Math.sign(h || 1) * m];
  }
  return [w, h];
}

/** Normalise un tracé libre : boîte + points relatifs */
export function finalizePencil(id: string, abs: [number, number][], style: Style): Shape {
  const xs = abs.map((p) => p[0]);
  const ys = abs.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(1, Math.max(...xs) - x);
  const h = Math.max(1, Math.max(...ys) - y);
  return {
    id,
    type: "pencil",
    x,
    y,
    w,
    h,
    points: abs.map(([px, py]) => [r2((px - x) / w), r2((py - y) / h)] as [number, number]),
    stroke: style.stroke,
    fill: "none",
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    dash: style.dash,
  };
}

/** Réduit le nombre de points d'un tracé (distance minimale) */
export function thinPoints(pts: [number, number][], min = 2): [number, number][] {
  const out: [number, number][] = [];
  for (const p of pts) {
    const l = out[out.length - 1];
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) >= min) out.push(p);
  }
  const last = pts[pts.length - 1];
  if (last && out[out.length - 1] !== last) out.push(last);
  return out;
}
