import { describe, expect, it } from "vitest";
import { contentBox, DEFAULT_STYLE, editorMarkup, finalizePencil, isDegenerate, resizeShape, SHAPE_TYPES, shapeNode, toSvg, type Shape } from "../src/draw/shapes";

const base = (type: Shape["type"], extra: Partial<Shape> = {}): Shape => ({
  id: `s-${type}`,
  type,
  x: 10,
  y: 20,
  w: 100,
  h: 60,
  stroke: "#111111",
  fill: "#ff0000",
  strokeWidth: 2,
  opacity: 1,
  dash: "solid",
  ...extra,
});

describe("dessin SVG", () => {
  it("propose au moins dix formes", () => {
    expect(SHAPE_TYPES.length).toBeGreaterThanOrEqual(10);
  });

  it("chaque forme produit un élément SVG", () => {
    for (const t of SHAPE_TYPES) {
      const s = t === "pencil" ? finalizePencil("p", [[0, 0], [10, 5], [20, 20]], DEFAULT_STYLE) : base(t, t === "text" ? { text: "Bonjour" } : {});
      const n = shapeNode(s);
      expect(n.tag, t).toMatch(/^(line|g|rect|circle|ellipse|polygon|path|text)$/);
    }
  });

  it("génère un document SVG valide et échappé", () => {
    const svg = toSvg({ width: 400, height: 300, background: "#ffffff", shapes: [base("rect"), base("circle"), base("text", { text: 'a < b & "c"' })] });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">');
    expect(svg).toContain('<rect x="0" y="0" width="400" height="300" fill="#ffffff"/>');
    expect(svg).toContain('<rect x="10" y="20" width="100" height="60" fill="#ff0000" stroke="#111111" stroke-width="2"/>');
    expect(svg).toContain('<circle cx="60" cy="50" r="30"');
    expect(svg).toContain("a &lt; b &amp; &quot;c&quot;");
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("recadre le viewBox sur le contenu", () => {
    const d = { width: 800, height: 600, background: "none", shapes: [base("rect", { strokeWidth: 0 })] };
    expect(contentBox(d.shapes)).toEqual({ x: 10, y: 20, w: 100, h: 60 });
    expect(toSvg(d, { crop: true, padding: 0 })).toContain('viewBox="10 20 100 60"');
  });

  it("normalise les boîtes tracées à l'envers", () => {
    expect(shapeNode(base("rect", { x: 110, y: 80, w: -100, h: -60 })).attrs).toMatchObject({ x: 10, y: 20, width: 100, height: 60 });
  });

  it("le carré et le cercle gardent leurs proportions au redimensionnement", () => {
    const r = resizeShape(base("square", { w: 50, h: 50 }), "se", 200, 80, false);
    expect(r.w).toBe(r.h);
  });

  it("ignore les formes vides", () => {
    expect(isDegenerate(base("rect", { w: 0, h: 1 }))).toBe(true);
    expect(isDegenerate(base("text", { text: "  " }))).toBe(true);
    expect(isDegenerate(base("line"))).toBe(false);
  });

  it("le canvas d'édition reprend le même balisage que le code", () => {
    const s = base("star");
    const code = toSvg({ width: 200, height: 200, background: "none", shapes: [s] });
    const points = String(shapeNode(s).attrs.points);
    expect(code).toContain(points);
    expect(editorMarkup([s])).toContain(points);
    expect(editorMarkup([s])).toContain('data-shape-id="s-star"');
    expect(code).not.toContain("data-shape-id");
  });
});
