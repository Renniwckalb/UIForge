import { describe, expect, it } from "vitest";
import { isRemoval, prepareSvg, recolorSvg, serializeSvg } from "../src/forge/svg/svg";
import { specToDoc, docToSpec } from "../src/forge/spec/spec";
import { generateTsx } from "../src/forge/codegen/tsx";
import { parseTsx } from "../src/forge/parser/tsx";
import { buildExport } from "../src/forge/export/bundle";
import { DEFAULT_SVG_MARKUP } from "../src/forge/bricks/defs/svg";
import type { ComponentDoc } from "../src/forge/model/types";

const LOGO = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Adobe Illustrator -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org" version="1.1" width="120px" height="40px" class="logo" id="Calque_1">
  <metadata>made with love</metadata>
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" style="stop-color: #9333ea; stop-opacity: 0.9"/>
    </linearGradient>
  </defs>
  <g inkscape:label="Layer 1" fill-rule="evenodd">
    <rect width="120" height="40" rx="8" fill="url(#g)"/>
    <use xlink:href="#g"/>
    <text x="60" y="26" text-anchor="middle" font-size="16" fill="#fff">Acme &amp; <tspan font-weight="700">Co</tspan></text>
  </g>
</svg>`;

const svgDoc = (markup: string, extra: Record<string, unknown> = {}) => {
  const r = specToDoc({ name: "LogoCard", children: [{ brick: "html.svg", props: { markup }, ...extra }] });
  expect(r.diagnostics).toEqual([]);
  return r.doc!;
};
const svgNode = (doc: ComponentDoc) => Object.values(doc.nodes).find((n) => n.brick === "html.svg")!;

describe("SVG : analyse et nettoyage", () => {
  it("normalise un fichier d'éditeur (métadonnées, taille → viewBox, xlink:href)", () => {
    const p = prepareSvg(LOGO);
    expect(p.tree).not.toBeNull();
    expect(p.issues).toEqual([]);
    expect(p.markup).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">');
    expect(p.markup).not.toMatch(/metadata|inkscape|Calque_1|class=|width="120px"/);
    expect(p.markup).toContain('<use href="#g"/>');
    expect(p.markup).toContain("Acme &amp; <tspan");
    // canonique : stable
    expect(prepareSvg(p.markup).markup).toBe(p.markup);
  });

  it.each([
    ['<svg><script>alert(1)</script></svg>', "element"],
    ['<svg onload="alert(1)"><rect/></svg>', "attribute"],
    ['<svg><rect onclick="x()"/></svg>', "attribute"],
    ['<svg><a href="javascript:alert(1)"><rect/></a></svg>', "element"],
    ['<svg><use href="https://evil.test/x.svg#a"/></svg>', "url"],
    ['<svg><image href="https://tracker.test/p.png"/></svg>', "url"],
    ['<svg><rect fill="url(https://evil.test/a)"/></svg>', "url"],
    ['<svg><rect style="fill: url(//evil.test/a); stroke: red"/></svg>', "url"],
    ['<svg><foreignObject><div>x</div></foreignObject></svg>', "element"],
    ['<svg><style>rect{fill:red}</style></svg>', "element"],
    ['<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>', "attribute"],
    ['<svg><set attributeName="onmouseover" to="alert(1)"/></svg>', "element"],
  ])("retire le contenu dangereux : %s", (markup, code) => {
    const p = prepareSvg(markup);
    expect(p.tree).not.toBeNull();
    expect(p.issues.filter(isRemoval).map((i) => i.code)).toContain(code);
    expect(p.markup).not.toMatch(/script|onload|onclick|javascript|evil|tracker|foreignObject|<style|alert/i);
  });

  it("garde les images data: sûres, refuse le SVG en data:", () => {
    expect(prepareSvg('<svg viewBox="0 0 1 1"><image href="data:image/png;base64,iVBORw0KGgo="/></svg>').issues).toEqual([]);
    expect(prepareSvg('<svg viewBox="0 0 1 1"><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>').issues.map((i) => i.code)).toEqual(["url"]);
  });

  it("erreurs bloquantes : XML invalide, racine absente, entités inconnues", () => {
    expect(prepareSvg("<svg><g></svg>").issues[0].code).toBe("parse");
    expect(prepareSvg("<div/>").issues[0].code).toBe("root");
    expect(prepareSvg("hello").issues[0].code).toBe("parse");
    expect(prepareSvg('<!DOCTYPE svg [<!ENTITY x "boom">]><svg>&x;</svg>').issues[0].code).toBe("parse");
  });

  it("recolore en currentColor sans toucher aux dégradés ni à none", () => {
    const t = recolorSvg(prepareSvg('<svg viewBox="0 0 2 2"><rect fill="#f00" stroke="none"/><circle fill="url(#g)" style="stroke: blue"/></svg>').tree!);
    expect(serializeSvg(t)).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2">\n  <rect fill="currentColor" stroke="none"/>\n  <circle fill="url(#g)" style="stroke: currentColor"/>\n</svg>');
  });
});

describe("SVG : brique html.svg", () => {
  it("spec stricte : le contenu retiré est une erreur avec son chemin JSON", () => {
    const r = specToDoc({ name: "X", children: [{ brick: "html.svg", props: { markup: '<svg onload="x()"><rect/></svg>' } }] });
    expect(r.doc).toBeNull();
    expect(r.diagnostics[0].message).toMatch(/^children\[0\]\.props\.markup: attribute onload/);
    expect(specToDoc({ name: "X", children: [{ brick: "html.svg", props: { markup: "<svg>" } }] }).diagnostics[0].message).toMatch(/invalid SVG/);
  });

  it("vrai JSX dans l'export, identifiants préfixés, aller-retour exact", () => {
    const doc = svgDoc(LOGO, { texts: { label: "Acme logo" } });
    const code = generateTsx(doc).code;
    expect(code).toContain('role="img"');
    expect(code).toContain('aria-label="Acme logo"');
    expect(code).toContain('viewBox="0 0 120 40"');
    expect(code).toContain('<linearGradient id="logo-card-svg1-g" x1="0" x2="1">');
    expect(code).toContain('fill="url(#logo-card-svg1-g)"');
    expect(code).toContain('style={{ stopColor: "#9333ea", stopOpacity: "0.9" }}');
    expect(code).toContain("fillRule=");
    expect(code).toContain('textAnchor="middle"');
    expect(code).not.toContain("dangerouslySetInnerHTML");
    const r = parseTsx(code, doc);
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    expect(svgNode(r.doc!).props.markup).toBe(svgNode(doc).props.markup);
    expect(svgNode(r.doc!).texts.label.value).toBe("Acme logo");
    expect(generateTsx(r.doc!).code).toBe(code);
  });

  it("décoratif par défaut (aria-hidden), libellé exposable en prop", () => {
    const plain = generateTsx(svgDoc(DEFAULT_SVG_MARKUP)).code;
    expect(plain).toContain('aria-hidden="true"');
    expect(plain).not.toContain("svgLabel");
    const doc = svgDoc(DEFAULT_SVG_MARKUP, { texts: { label: "Star" }, textProps: { label: "iconLabel" } });
    const code = generateTsx(doc).code;
    expect(code).toContain("aria-label={iconLabel}");
    expect(code).toContain('iconLabel = "Star"');
    const back = parseTsx(code, doc).doc!;
    expect(svgNode(back).texts.label).toEqual({ value: "Star", expose: true, propName: "iconLabel" });
    expect(docToSpec(back).children![0]).toMatchObject({ texts: { label: "Star" }, textProps: { label: "iconLabel" } });
  });

  it("SVG modifié à la main dans le code : nettoyé, dynamique → bloc brut", () => {
    const doc = svgDoc(DEFAULT_SVG_MARKUP);
    const code = generateTsx(doc).code;
    const edited = code.replace("<path ", '<circle cx="12" cy="12" r="3" onClick={() => alert(1)} />\n      <path ');
    expect(parseTsx(edited, doc).doc!.nodes.raw1).toBeDefined(); // onClick dynamique → non représentable
    const injected = code.replace("<path ", '<circle cx="12" cy="12" r="3" onMouseOver="alert(1)" />\n      <path ');
    const r = parseTsx(injected, doc);
    expect(svgNode(r.doc!).props.markup).toContain('<circle cx="12" cy="12" r="3"/>');
    expect(svgNode(r.doc!).props.markup).not.toContain("alert");
    expect(r.diagnostics.some((d) => d.severity === "warning" && /onMouseOver/.test(d.message))).toBe(true);
  });

  it("export React : aucune dépendance ajoutée", () => {
    const b = buildExport(svgDoc(LOGO));
    expect(b.files["index.tsx"]).toContain("<svg");
    expect(b.files["README.md"]).toBeDefined();
    expect(Object.keys(b.files).filter((f) => f.startsWith("ui/"))).toEqual([]);
  });
});
