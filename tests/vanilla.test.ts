import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/forge/model/templates";
import { buildVanillaFiles, combinations, elementTag, customActionsJs, dataAttrName, propBindings, vanillaConfig, variantPlan } from "../src/forge/export/vanilla";
import { scopeClass } from "../src/forge/codegen/css";

describe("export HTML / CSS / JS", () => {
  for (const t of TEMPLATES) {
    it(`composant importable dans son dossier : ${t.id}`, () => {
      const doc = t.build();
      const { files, folder, dir, tag } = buildVanillaFiles(doc, { html: `<div class="${scopeClass(doc)}">x</div>`, tailwindCss: "@property --tw-x { syntax: \"*\"; inherits: false }\n.flex{display:flex}" });
      const kebab = dir.split("/").pop()!;
      expect(folder).toMatch(/-js$/);
      expect(dir).toMatch(/^components\/[a-z0-9-]+$/);
      expect(tag).toMatch(/^[a-z][a-z0-9]*-[a-z0-9-]*$/);
      expect(Object.keys(files).sort()).toEqual(
        ["README.md", "index.html", ...["README.md", "THIRD_PARTY_NOTICES.md", "index.d.ts", "index.js", `${kebab}.umd.js`, "package.json", "react.d.ts", "react.js"].map((f) => `${dir}/${f}`)].sort(),
      );
      // la page principale récupère le composant depuis son dossier
      expect(files["index.html"]).toContain(`<script src="${dir}/${kebab}.umd.js"></script>`);
      expect(files["index.html"]).toContain(`<${tag}></${tag}>`);
      const esm = files[`${dir}/index.js`];
      const umd = files[`${dir}/${kebab}.umd.js`];
      expect(esm).toContain(".flex{display:flex}");
      expect(esm).toMatch(/^export default api;$/m);
      expect(esm).toMatch(/^export var mount = api\.mount;$/m);
      expect(umd).not.toMatch(/^\s*(import|export)\b/m);
      expect(files[`${dir}/react.js`]).toMatch(/^"use client";/);
      // @property déclarées au niveau du document (ignorées dans un Shadow DOM)
      expect(esm).toContain('var PROPERTY_CSS = "@property --tw-x');
      expect(files[`${dir}/react.js`]).toContain('from "./index.js"');
      expect(JSON.parse(files[`${dir}/package.json`])).toMatchObject({ main: `${kebab}.umd.js`, module: "index.js", types: "index.d.ts" });
    });
  }

  it("le script UMD s'exécute sans DOM (SSR, CommonJS) et expose l'API", () => {
    for (const t of TEMPLATES) {
      const doc = t.build();
      const { files, dir, tag } = buildVanillaFiles(doc, { html: "", tailwindCss: "" });
      const kebab = dir.split("/").pop()!;
      const mod = { exports: {} as Record<string, unknown> };
      new Function("module", "exports", files[`${dir}/${kebab}.umd.js`])(mod, mod.exports);
      expect(mod.exports.tagName).toBe(tag);
      expect(typeof mod.exports.mount).toBe("function");
      expect(mod.exports.props).toContain("colorScheme");
      expect(() => (mod.exports.mount as (t: string) => void)("#app")).toThrow(/browser/);
    }
  });

  it("nom de balise valide pour un élément personnalisé", () => {
    expect(elementTag("PricingCard")).toBe("pricing-card");
    expect(elementTag("Card")).toBe("ui-card");
    expect(elementTag("3D")).toBe("ui-3-d");
  });

  it("la configuration reprend états, raccourcis et interactions", () => {
    const doc = TEMPLATES.find((t) => t.id === "command-palette")!.build();
    const cfg = vanillaConfig(doc);
    const palette = Object.values(cfg.nodes).find((n) => n.brick === "cmdk.dialog");
    expect(palette).toBeDefined();
    expect(palette!.open).toBe(false);
    expect(palette!.props.shortcut).toBe("mod+k");
  });

  it("expose les mêmes props que l'export React", () => {
    const doc = TEMPLATES.find((t) => t.id === "pricing-card")!.build();
    const { props, defaults } = propBindings(doc);
    const texts = Object.entries(props).filter(([, b]) => b.kind === "text");
    expect(texts.length).toBeGreaterThan(0);
    for (const [name, b] of texts) {
      expect(b.kind === "text" && doc.nodes[b.node].texts[b.key].propName).toBe(name);
      expect(defaults[name]).toBeDefined();
    }
    expect(props.colorScheme).toEqual({ kind: "scheme" });
    expect(dataAttrName("ctaLabel")).toBe("data-cta-label");
  });

  it("pré-rend les variantes des props exposées (énumérations, booléens)", () => {
    const doc = TEMPLATES.find((t) => t.id === "pricing-card")!.build();
    const btn = Object.values(doc.nodes).find((n) => n.brick === "shadcn.button")!;
    doc.exposedProps.push({ nodeId: btn.id, prop: "variant", propName: "ctaVariant" }, { nodeId: btn.id, prop: "disabled", propName: "ctaDisabled" });
    const plan = variantPlan(doc);
    expect(plan).toHaveLength(1);
    expect(plan[0].props.map((p) => p.propName)).toEqual(["ctaVariant", "ctaDisabled"]);
    expect(combinations(plan[0].props)).toHaveLength(6 * 2);
  });

  it("convertit les actions personnalisées en JavaScript exécutable", () => {
    const doc = TEMPLATES.find((t) => t.id === "drawer-confirm")!.build();
    const drawer = Object.values(doc.nodes).find((n) => n.brick === "baseui.drawer")!;
    const btn = Object.values(doc.nodes).find((n) => n.brick === "shadcn.button")!;
    btn.interactions = [
      { trigger: "click", action: { type: "custom", code: `const n: number = 2; setDrawer1Open((v) => !v); window.__hits = (window.__hits ?? 0) + n` } },
      { trigger: "click", action: { type: "custom", code: `<div />` } },
    ];
    const js = customActionsJs(doc, ["ctaLabel"]);
    expect(js.split("source:")[0]).not.toContain(": number");
    const CUSTOM = new Function(`${js}; return CUSTOM;`)();
    let open = false;
    const $ = { root: { className: "x" }, props: { ctaLabel: "A" }, get: () => open, setter: () => (v: unknown) => (open = typeof v === "function" ? (v as (b: boolean) => boolean)(open) : (v as boolean)), input: () => null };
    const g = globalThis as unknown as { window?: Record<string, unknown> };
    g.window = {};
    const fns = CUSTOM.base($);
    fns[`${btn.id}:0`]();
    expect(open).toBe(true);
    expect(g.window.__hits).toBe(2);
    expect(() => fns[`${btn.id}:1`]()).toThrow(/not convertible/);
    expect(drawer.id).toBe("drawer1");
    delete g.window;
  });
});

