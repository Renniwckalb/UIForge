import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/forge/model/templates";
import { generateTsx } from "../src/forge/codegen/tsx";
import { generateCss } from "../src/forge/codegen/css";
import { parseTsx } from "../src/forge/parser/tsx";
import { parseCss } from "../src/forge/parser/css";
import { buildExport } from "../src/forge/export/bundle";
import type { ComponentDoc } from "../src/forge/model/types";

const tpl = (id: string) => TEMPLATES.find((t) => t.id === id)!.build();
const cardOf = (d: ComponentDoc) => Object.values(d.nodes).find((n) => n.brick === "shadcn.card")!;

describe("styles par breakpoint", () => {
  it("génère des classes md:/lg: et les relit dans le bon breakpoint", () => {
    const doc = tpl("pricing-card");
    const card = cardOf(doc);
    card.style.md = { px: { token: "space.8" }, maxWidth: { value: "32rem" } };
    card.style.lg = { radius: { token: "radius.2xl" } };
    const code = generateTsx(doc).code;
    expect(code).toContain("md:[padding-inline:var(--space-8)]!");
    expect(code).toContain(`md:[max-width:var(--${card.id}-md-max-width)]!`);
    expect(code).toContain("lg:[border-radius:var(--radius-2xl)]!");
    const css = generateCss(doc);
    expect(css).toContain(`--${card.id}-md-max-width: 32rem;`);

    const r = parseTsx(code, doc);
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    expect(cardOf(r.doc!).style.md).toEqual(card.style.md);
    expect(cardOf(r.doc!).style.lg).toEqual(card.style.lg);
    expect(generateTsx(r.doc!).code).toBe(code);

    const rc = parseCss(css, doc);
    expect(cardOf(rc.doc!).style.md).toEqual(card.style.md);
  });

  it("une classe md: tapée à la main est relue comme surcharge", () => {
    const doc = tpl("pricing-card");
    const card = cardOf(doc);
    const code = generateTsx(doc).code.replace(`pricing-card__${card.id}`, `pricing-card__${card.id} md:[padding-block:var(--space-12)]!`);
    const r = parseTsx(code, doc);
    expect(cardOf(r.doc!).style.md).toEqual({ py: { token: "space.12" } });
  });
});

describe("rien ne disparaît", () => {
  it("classes Tailwind tapées à la main → className brut fusionné avec cn()", () => {
    const doc = tpl("pricing-card");
    const card = cardOf(doc);
    const code = generateTsx(doc).code.replace(`className="pricing-card__${card.id}"`, `className="pricing-card__${card.id} ring-2 ring-offset-4"`);
    const r = parseTsx(code, doc);
    expect(r.diagnostics.some((d) => d.severity === "warning" || d.severity === "error")).toBe(false);
    expect(cardOf(r.doc!).className).toBe("ring-2 ring-offset-4");
    const regen = generateTsx(r.doc!).code;
    expect(regen).toContain(`className={cn("pricing-card__${card.id}", "ring-2 ring-offset-4")}`);
    expect(regen).toContain(`import { cn } from "cn";`);
    expect(generateTsx(parseTsx(regen, r.doc!).doc!).code).toBe(regen);
  });

  it("imports, déclarations, instructions et attributs inconnus sont conservés", () => {
    const doc = tpl("pricing-card");
    const card = cardOf(doc);
    let code = generateTsx(doc).code;
    code = code.replace(`import "./styles.css";`, `import { track } from "@/lib/analytics";\nimport "./styles.css";`);
    code = code.replace(`export default function`, `const PLAN = "pro";\n\nexport default function`);
    code = code.replace(`  const scopeClassName`, `  React.useEffect(() => track(PLAN), []);\n  const scopeClassName`);
    code = code.replace(`className="pricing-card__${card.id}"`, `className="pricing-card__${card.id}" data-plan={PLAN} id="tarif"`);
    const r = parseTsx(code, doc);
    expect(r.diagnostics.filter((d) => d.severity === "warning" || d.severity === "error")).toEqual([]);
    const regen = generateTsx(r.doc!).code;
    expect(regen).toContain(`import { track } from "@/lib/analytics";`);
    expect(regen).toContain(`const PLAN = "pro";`);
    expect(regen).toContain(`React.useEffect(() => track(PLAN), []);`);
    expect(regen).toContain(`data-plan={PLAN}`);
    expect(regen).toContain(`id="tarif"`);
    expect(generateTsx(parseTsx(regen, r.doc!).doc!).code).toBe(regen);
  });

  it("une action de clic inconnue est conservée", () => {
    const doc = tpl("drawer-confirm");
    const code = generateTsx(doc).code.replace(`onClick={() => setDrawer1Open(false)}`, `onClick={() => {\n  setDrawer1Open(false);\n  console.log("annulé");\n}}`);
    const r = parseTsx(code, doc);
    const regen = generateTsx(r.doc!).code;
    expect(regen).toContain(`console.log("annulé")`);
    expect(regen).toContain(`setDrawer1Open(false)`);
  });

  it("un sous-élément modifié devient un bloc brut conservé", () => {
    const doc = tpl("pricing-card");
    const code = generateTsx(doc).code.replace("<CardHeader>", `<CardHeader className="pb-0">`);
    const r = parseTsx(code, doc);
    expect(Object.values(r.doc!.nodes).some((n) => n.brick === "raw.jsx")).toBe(true);
    expect(generateTsx(r.doc!).code).toContain(`<CardHeader className="pb-0">`);
  });
});

describe("raccourcis cmdk", () => {
  it("shortcut et enableShortcut sont exposés et relus", () => {
    const doc = tpl("command-palette");
    const g = generateTsx(doc);
    expect(g.code).toContain(`shortcut = "mod+k"`);
    expect(g.code).toContain(`enableShortcut = true`);
    expect(g.code).toContain("function matchesShortcut");
    const r = parseTsx(g.code.replace(`shortcut = "mod+k"`, `shortcut = "mod+j"`), doc);
    const pal = Object.values(r.doc!.nodes).find((n) => n.brick === "cmdk.dialog")!;
    expect(pal.props.shortcut).toBe("mod+j");
    expect(r.doc!.exposedProps.filter((e) => e.nodeId === pal.id).map((e) => e.prop).sort()).toEqual(["enableShortcut", "shortcut"]);
    expect(generateTsx(r.doc!).code).toContain(`shortcut = "mod+j"`);
  });

  it("export : README + THIRD_PARTY_NOTICES", () => {
    const b = buildExport(tpl("drawer-confirm"));
    expect(Object.keys(b.files)).toContain("THIRD_PARTY_NOTICES.md");
    expect(b.files["THIRD_PARTY_NOTICES.md"]).toContain("Copyright (c) 2023 shadcn");
    expect(b.files["THIRD_PARTY_NOTICES.md"]).not.toContain("Magic UI");
  });
});

describe("licences des exports", () => {
  it("aucun fichier ni dépendance sharp / libvips dans les exports", () => {
    for (const t of TEMPLATES) {
      for (const language of ["tsx", "jsx"] as const) {
        const b = buildExport(t.build(), { language });
        expect(b.npm.some((n) => /sharp|libvips|@img\//.test(n))).toBe(false);
        for (const [path, content] of Object.entries(b.files)) {
          expect(path).not.toMatch(/sharp|libvips/i);
          expect(content).not.toMatch(/\bsharp\b|libvips|@img\//i);
        }
      }
    }
  });
});
