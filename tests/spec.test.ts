import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/forge/model/templates";
import { docToSpec, specToDoc } from "../src/forge/spec/spec";
import { decodePayload, encodePayload, loadAgentJson, readSpecFromLocation } from "../src/forge/spec/link";
import { generateTsx } from "../src/forge/codegen/tsx";
import { generateCss } from "../src/forge/codegen/css";
import { jsonSchema, llmsTxt } from "../src/forge/spec/docs";

describe("spec pour agents", () => {
  for (const t of TEMPLATES) {
    it(`aller-retour modèle → spec → modèle : ${t.id}`, () => {
      const doc = t.build();
      const spec = docToSpec(doc);
      const r = specToDoc(JSON.parse(JSON.stringify(spec)));
      expect(r.diagnostics).toEqual([]);
      expect(generateTsx(r.doc!).code).toBe(generateTsx(doc).code);
      expect(generateCss(r.doc!)).toBe(generateCss(doc));
    });
  }

  it("spec minimale écrite à la main", () => {
    const r = specToDoc({
      name: "hello card",
      theme: { preset: "beautiful-ui", colors: { light: { primary: "#7c3aed" } }, exposeColors: { primary: "brandColor" } },
      children: [
        {
          brick: "shadcn.card",
          texts: { title: "Hello", description: "World" },
          style: { maxWidth: "24rem", shadow: "shadow.md", hover: { shadow: "shadow.lg" } },
          animation: "fade-up",
          children: [{ brick: "shadcn.button", texts: { label: "Open" }, props: { variant: "outline" }, exposeProps: { variant: "ctaVariant" }, onClick: [{ action: "open", target: "d" }] }],
        },
        { brick: "baseui.drawer", ref: "d", texts: { title: "Drawer" }, slots: { content: [{ brick: "html.text", texts: { text: "Inside" } }] } },
      ],
    });
    expect(r.diagnostics).toEqual([]);
    const doc = r.doc!;
    expect(doc.name).toBe("HelloCard");
    expect(doc.theme.preset?.id).toBe("beautiful-ui");
    expect(doc.theme.color.light.primary).toBe("#7c3aed");
    const btn = Object.values(doc.nodes).find((n) => n.brick === "shadcn.button")!;
    expect(btn.interactions[0].action).toEqual({ type: "open", target: "drawer1" });
    expect(doc.exposedProps).toContainEqual({ nodeId: btn.id, prop: "variant", propName: "ctaVariant" });
    const card = Object.values(doc.nodes).find((n) => n.brick === "shadcn.card")!;
    expect(card.style.base.maxWidth).toEqual({ value: "24rem" });
    expect(card.style.hover?.shadow).toEqual({ token: "shadow.lg" });
    expect(generateTsx(doc).code).toContain("ctaVariant");
  });

  it("erreurs précises avec le chemin JSON", () => {
    const r = specToDoc({
      name: "Bad",
      children: [
        { brick: "shadcn.buton" },
        { brick: "shadcn.button", props: { variant: "huge", size: "xl" }, texts: { title: "x" }, style: { color: "red", bg: "color.nope" }, onClick: [{ action: "open", target: "zz" }] },
        { brick: "shadcn.dialog", slots: { trigger: [{ brick: "layout.stack" }] } },
      ],
    });
    expect(r.doc).toBeNull();
    const msgs = r.diagnostics.map((d) => d.message);
    expect(msgs.some((m) => m.startsWith('children[0].brick: unknown brick "shadcn.buton"'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('children[1].props.variant: "huge" is not valid'))).toBe(true);
    expect(msgs.some((m) => m.startsWith("children[1].texts.title: unknown text"))).toBe(true);
    expect(msgs.some((m) => m.startsWith("children[1].style.color: unknown style key"))).toBe(true);
    expect(msgs.some((m) => m.startsWith('children[1].style.bg: unknown token "color.nope"'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('children[1].onClick[0].target: unknown ref "zz"'))).toBe(true);
    expect(msgs.some((m) => m.startsWith("children[2].slots.trigger[0]: slot"))).toBe(true);
  });

  it("liens : JSON brut, base64url et compressé", async () => {
    const json = JSON.stringify({ name: "Linked", children: [{ brick: "html.heading", texts: { text: "Héllo 👋" } }] });
    const z = await encodePayload(json);
    expect(z.startsWith("z.")).toBe(true);
    expect(await decodePayload(z)).toBe(json);
    const b64 = Buffer.from(json).toString("base64url");
    expect(await decodePayload(b64)).toBe(json);
    const fromHash = await readSpecFromLocation({ search: "", hash: `#spec=${z}` });
    expect(fromHash.text).toBe(json);
    const fromQuery = await readSpecFromLocation({ search: `?spec=${encodeURIComponent(json)}`, hash: "" });
    expect(fromQuery.text).toBe(json);
    const r = loadAgentJson(fromQuery.text!);
    expect(r.kind).toBe("spec");
    expect(r.doc?.name).toBe("Linked");
  });

  it("lien vers un JSON hébergé (?src=) et modèle complet", async () => {
    const doc = TEMPLATES[1].build();
    const fake = (async () => new Response(JSON.stringify(doc))) as unknown as typeof fetch;
    const r = await readSpecFromLocation({ search: "?src=https://example.com/model.json", hash: "" }, fake);
    const loaded = loadAgentJson(r.text!);
    expect(loaded.kind).toBe("doc");
    expect(loaded.doc?.name).toBe(doc.name);
    expect(loaded.doc?.id).not.toBe(doc.id);
    expect((await readSpecFromLocation({ search: "?src=javascript:alert(1)", hash: "" })).error).toBe("src-url");
  });
});

/* ——— JSON Schema (/schema.json) : validateur minimal du sous-ensemble utilisé ——— */

type S = Record<string, unknown>;
function validate(schema: S, v: unknown, root: S, path = "$"): string[] {
  if (typeof schema.$ref === "string") return validate((root.$defs as S)[(schema.$ref as string).replace("#/$defs/", "")] as S, v, root, path);
  if (schema.oneOf) {
    const ok = (schema.oneOf as S[]).filter((s) => !validate(s, v, root, path).length).length;
    return ok === 1 ? [] : [`${path}: matches ${ok} oneOf branches`];
  }
  if (schema.anyOf) return (schema.anyOf as S[]).some((s) => !validate(s, v, root, path).length) ? [] : [`${path}: matches no anyOf branch`];
  if ("const" in schema) return v === schema.const ? [] : [`${path}: expected ${JSON.stringify(schema.const)}`];
  if (schema.enum) return (schema.enum as unknown[]).includes(v) ? [] : [`${path}: not in enum`];
  const t = schema.type;
  if (t === "string") return typeof v === "string" && (!schema.pattern || new RegExp(schema.pattern as string).test(v)) ? [] : [`${path}: expected string`];
  if (t === "boolean") return typeof v === "boolean" ? [] : [`${path}: expected boolean`];
  if (t === "number") return typeof v === "number" && v >= ((schema.minimum as number) ?? -Infinity) && v <= ((schema.maximum as number) ?? Infinity) ? [] : [`${path}: expected number in range`];
  if (t === "array") {
    if (!Array.isArray(v)) return [`${path}: expected array`];
    if (schema.maxItems !== undefined && v.length > (schema.maxItems as number)) return [`${path}: too many items`];
    return v.flatMap((x, i) => validate(schema.items as S, x, root, `${path}[${i}]`));
  }
  if (t === "object") {
    if (!v || typeof v !== "object" || Array.isArray(v)) return [`${path}: expected object`];
    const o = v as S;
    const props = (schema.properties ?? {}) as Record<string, S>;
    const errs = ((schema.required ?? []) as string[]).filter((k) => !(k in o)).map((k) => `${path}.${k}: required`);
    for (const [k, x] of Object.entries(o)) {
      if (props[k]) errs.push(...validate(props[k], x, root, `${path}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${path}.${k}: not allowed`);
    }
    return errs;
  }
  return [];
}

describe("documentation pour agents", () => {
  const schema = jsonSchema("https://forge.test");
  it("les specs des modèles sont valides selon /schema.json", () => {
    for (const t of TEMPLATES) expect(validate(schema, JSON.parse(JSON.stringify(docToSpec(t.build()))), schema)).toEqual([]);
  });
  it("/schema.json rejette ce que le validateur rejette", () => {
    expect(validate(schema, { name: "X", children: [{ brick: "shadcn.button", props: { variant: "huge" } }] }, schema).length).toBeGreaterThan(0);
    expect(validate(schema, { name: "X", children: [{ brick: "shadcn.button", texts: { title: "x" } }] }, schema).length).toBeGreaterThan(0);
    expect(validate(schema, { name: "X", children: [{ brick: "nope" }] }, schema).length).toBeGreaterThan(0);
  });
  it("/llms.txt : briques, format, lien d'exemple valide", async () => {
    const md = llmsTxt("https://forge.test");
    for (const b of ["shadcn.card", "baseui.drawer", "magicui.marquee"]) expect(md).toContain(`### \`${b}\``);
    const link = md.match(/Example link: (\S+)/)![1];
    const u = new URL(link);
    const r = await readSpecFromLocation({ search: u.search, hash: u.hash });
    expect(loadAgentJson(r.text!).diagnostics).toEqual([]);
    const blocks = [...md.slice(md.indexOf("## Examples")).matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(specToDoc(b).diagnostics).toEqual([]);
  });
});
