import { describe, expect, it } from "vitest";
import { docToSpec, specToDoc } from "../src/forge/spec/spec";
import { generateTsx } from "../src/forge/codegen/tsx";
import { parseTsx } from "../src/forge/parser/tsx";
import { buildExport } from "../src/forge/export/bundle";
import { normalizeDoc } from "../src/forge/model/ops";
import { isLucideIcon, LUCIDE_ICON_NAMES, searchIcons, suggestIcons } from "../src/forge/icons/lucide";
import { handleMcpPost } from "../src/forge/mcp/server";
import type { ComponentDoc } from "../src/forge/model/types";

const iconNodes = (doc: ComponentDoc) => Object.values(doc.nodes).filter((n) => n.brick === "lucide.icon");
const build = (children: unknown[]) => {
  const r = specToDoc({ name: "IconRow", root: { props: { direction: "row" } }, children });
  expect(r.diagnostics).toEqual([]);
  return r.doc!;
};

describe("icônes Lucide : liste et recherche", () => {
  it("liste générée depuis lucide-react", async () => {
    const lucide = (await import("lucide-react")) as unknown as Record<string, unknown> & { icons: Record<string, unknown> };
    expect(LUCIDE_ICON_NAMES.length).toBeGreaterThan(1500);
    for (const n of ["ArrowRight", "Star", "Trash", "ShoppingCart", "ChevronDown"]) {
      expect(isLucideIcon(n), n).toBe(true);
      expect(lucide[`${n}Icon`], n).toBe(lucide.icons[n]);
    }
  });

  it("recherche par mots, PascalCase, kebab-case et synonymes", () => {
    expect(searchIcons("arrow right")[0]).toBe("ArrowRight");
    expect(searchIcons("arrow-right")[0]).toBe("ArrowRight");
    expect(searchIcons("ShoppingCart")[0]).toBe("ShoppingCart");
    expect(searchIcons("delete")).toContain("Trash");
    expect(searchIcons("settings")).toContain("Settings");
    expect(searchIcons("zzzzqqq")).toEqual([]);
  });

  it("suggestions pour un nom inconnu", () => {
    expect(suggestIcons("arrow-right")).toEqual(["ArrowRight"]);
    expect(suggestIcons("ArrowRightIcon")).toEqual(["ArrowRight"]);
    expect(suggestIcons("Trashcan")).toContain("Trash");
    expect(suggestIcons("trash-2")).toEqual(["Trash"]);
  });
});

describe("brique lucide.icon", () => {
  it("spec : nom inconnu → erreur avec suggestions", () => {
    const r = specToDoc({ name: "X", children: [{ brick: "lucide.icon", props: { name: "Trashcan" } }] });
    expect(r.doc).toBeNull();
    expect(r.diagnostics[0].message).toMatch(/^children\[0\]\.props\.name: unknown Lucide icon "Trashcan" \(did you mean: .*Trash/);
  });

  it("export : import nommé <Nom>Icon, couleur et taille par le style, aller-retour exact", () => {
    const doc = build([
      { brick: "lucide.icon", props: { name: "ArrowRight" }, style: { fg: "color.primary", width: "2rem" } },
      { brick: "lucide.icon", props: { name: "ShoppingCart", strokeWidth: 1.5 }, texts: { label: "Cart" } },
      { brick: "shadcn.button", texts: { label: "Go" } },
    ]);
    const code = generateTsx(doc).code;
    expect(code).toContain('import { ArrowRightIcon, ShoppingCartIcon } from "lucide-react";');
    expect(code).toContain('<ArrowRightIcon className="icon-row__icon1 h-auto shrink-0" />');
    expect(code).toMatch(/<ShoppingCartIcon\s+className="icon-row__icon2 h-auto shrink-0"\s+strokeWidth=\{1\.5\}\s+aria-label="Cart"\s+\/>/);
    const r = parseTsx(code, doc);
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    expect(iconNodes(r.doc!).map((n) => [n.props.name, n.props.strokeWidth, n.texts.label.value])).toEqual([
      ["ArrowRight", 2, ""],
      ["ShoppingCart", 1.5, "Cart"],
    ]);
    expect(generateTsx(r.doc!).code).toBe(code);
    expect(docToSpec(r.doc!).children![0]).toEqual({ brick: "lucide.icon", props: { name: "ArrowRight" }, style: { fg: "color.primary", width: "2rem" } });
  });

  it("ancien nom (Trash2) : accepté dans une spec et dans le code, converti en nom canonique", () => {
    const doc = build([{ brick: "lucide.icon", props: { name: "Trash2" } }]);
    expect(iconNodes(doc)[0].props.name).toBe("Trash");
    const code = generateTsx(doc).code;
    expect(code).toContain("<TrashIcon ");
    const back = parseTsx(code.replace(/TrashIcon/g, "Trash2Icon"), doc).doc!;
    expect(iconNodes(back)[0].props.name).toBe("Trash");
  });

  it("changer l'icône dans le code met à jour le modèle", () => {
    const doc = build([{ brick: "lucide.icon", props: { name: "Star" } }]);
    const code = generateTsx(doc).code.replace(/StarIcon/g, "HeartIcon");
    expect(iconNodes(parseTsx(code, doc).doc!)[0].props.name).toBe("Heart");
  });

  it("README : lucide-react dans la commande d'installation", () => {
    const b = buildExport(build([{ brick: "lucide.icon", props: { name: "Rocket" } }]));
    expect(b.installCommand).toContain("lucide-react");
    expect(b.files["THIRD_PARTY_NOTICES.md"]).toMatch(/lucide/i);
  });

  it("modèle importé avec une icône inconnue → icône par défaut", () => {
    const doc = build([{ brick: "lucide.icon", props: { name: "Star" } }]);
    iconNodes(doc)[0].props.name = "NoSuchIcon";
    normalizeDoc(doc);
    expect(iconNodes(doc)[0].props.name).toBe("Star");
  });

  it("MCP : search_icons", async () => {
    const res = await handleMcpPost(new Request("https://forge.test/api/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_icons", arguments: { query: "shopping cart", limit: 5 } } }) }));
    const json = await res.json();
    expect(json.result.structuredContent.icons[0]).toBe("ShoppingCart");
    expect(json.result.content[0].text).toContain('"brick": "lucide.icon"');
  });
});
