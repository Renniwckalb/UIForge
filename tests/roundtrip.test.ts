import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/forge/model/templates";
import { generateTsx } from "../src/forge/codegen/tsx";
import { generateCss } from "../src/forge/codegen/css";
import { parseTsx } from "../src/forge/parser/tsx";
import { parseCss } from "../src/forge/parser/css";

describe("aller-retour codegen ↔ parser", () => {
  for (const t of TEMPLATES) {
    it(`TSX stable : ${t.id}`, () => {
      const doc = t.build();
      const code = generateTsx(doc).code;
      const r = parseTsx(code, doc);
      expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
      expect(r.doc).not.toBeNull();
      expect(generateTsx(r.doc!).code).toBe(code);
      // le modèle est équivalent (hors métadonnées)
      expect(Object.keys(r.doc!.nodes).sort()).toEqual(Object.keys(doc.nodes).sort());
      for (const id of Object.keys(doc.nodes)) {
        expect(r.doc!.nodes[id].props).toEqual(doc.nodes[id].props);
        expect(r.doc!.nodes[id].texts).toEqual(doc.nodes[id].texts);
        expect(r.doc!.nodes[id].interactions).toEqual(doc.nodes[id].interactions);
        expect(r.doc!.nodes[id].slots).toEqual(doc.nodes[id].slots);
      }
    });
    it(`CSS stable : ${t.id}`, () => {
      const doc = t.build();
      const css = generateCss(doc);
      const r = parseCss(css, doc);
      expect(r.diagnostics).toEqual([]);
      expect(generateCss(r.doc!)).toBe(css);
      for (const id of Object.keys(doc.nodes)) {
        expect(r.doc!.nodes[id].style).toEqual(doc.nodes[id].style);
        expect(r.doc!.nodes[id].animation).toEqual(doc.nodes[id].animation);
      }
    });
  }

  it("modifier un texte dans le code met à jour le modèle", () => {
    const doc = TEMPLATES.find((t) => t.id === "pricing-card")!.build();
    const code = generateTsx(doc).code.replace('title = "Pro"', 'title = "Entreprise"').replace('variant="outline"', "");
    const r = parseTsx(code, doc);
    const card = Object.values(r.doc!.nodes).find((n) => n.brick === "shadcn.card")!;
    expect(card.texts.title.value).toBe("Entreprise");
  });

  it("le code non reconnu est conservé et signalé sans bloquer", () => {
    const doc = TEMPLATES.find((t) => t.id === "blank")!.build();
    const code = generateTsx(doc).code.replace(/(className=\{`\$\{scopeClassName\} [^`]+`\}\s*style=\{scopeStyle\}\s*)\/>/, "$1><marquee>hello</marquee></div>");
    const r = parseTsx(code, doc);
    expect(r.doc).not.toBeNull();
    expect(Object.values(r.doc!.nodes).some((n) => n.brick === "raw.jsx")).toBe(true);
    expect(r.diagnostics.some((d) => d.severity === "warning")).toBe(true);
    expect(generateTsx(r.doc!).code).toContain("<marquee>hello</marquee>");
  });

  it("une erreur de syntaxe est signalée sans produire de modèle", () => {
    const doc = TEMPLATES[0].build();
    const r = parseTsx(generateTsx(doc).code.replace("return (", "return ((("), doc);
    expect(r.doc).toBeNull();
    expect(r.diagnostics[0].severity).toBe("error");
    expect(r.diagnostics[0].line).toBeGreaterThan(0);
  });
});
