import { describe, expect, it } from "vitest";
import { ApiError, makeLink, readRequest, runExport } from "../src/forge/export/api";
import { decodePayload, encodePayload } from "../src/forge/spec/link";

const spec = { name: "ApiCard", children: [{ brick: "shadcn.card", texts: { title: "From the API" }, children: [{ brick: "shadcn.button", texts: { label: "Go" } }] }] };
const post = (body: unknown) => new Request("https://forge.test/api/export", { method: "POST", body: JSON.stringify(body) });

describe("API d'export et de liens", () => {
  it("POST : valeurs par défaut (React, tsx, anglais, JSON)", async () => {
    const r = await readRequest(post({ spec }));
    expect(r).toMatchObject({ format: "react", language: "tsx", locale: "en", output: "json" });
    const out = await runExport(r);
    expect(out.folder).toBe("api-card");
    expect(Object.keys(out.files)).toEqual(expect.arrayContaining(["index.tsx", "styles.css", "ui/button.tsx", "ui/card.tsx", "README.md", "THIRD_PARTY_NOTICES.md"]));
    expect(out.files["index.tsx"]).toContain('"From the API"');
    expect(out.install).toMatch(/^npm install /);
  });

  it("GET avec spec compressée, JavaScript et français", async () => {
    const z = await encodePayload(JSON.stringify(spec));
    const out = await runExport(await readRequest(new Request(`https://forge.test/api/export?spec=${z}&language=jsx&locale=fr`)));
    expect(out.files["index.jsx"]).toBeDefined();
    expect(out.files["README.md"]).toContain("## Licences");
  });

  it("erreurs : paramètres, JSON, spec invalide (422 avec chemins)", async () => {
    await expect(readRequest(post({ spec, format: "vue" }))).rejects.toMatchObject({ status: 400 });
    await expect(readRequest(new Request("https://forge.test/api/export", { method: "POST", body: "nope" }))).rejects.toMatchObject({ status: 400 });
    await expect(readRequest(post({}))).rejects.toMatchObject({ status: 400 });
    const bad = await readRequest(post({ spec: { name: "X", children: [{ brick: "shadcn.button", props: { size: "huge" } }] } }));
    const e = await runExport(bad).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(422);
    expect(e.diagnostics[0].message).toMatch(/^children\[0\]\.props\.size: /);
  });

  it("lien de création compressé, décodable par /new", async () => {
    const l = await makeLink("https://forge.test", spec, "en");
    expect(l.url.startsWith("https://forge.test/new#spec=z.")).toBe(true);
    expect(JSON.parse(await decodePayload(l.url.split("#spec=")[1]))).toEqual(spec);
    expect(l.queryUrl).toContain("/new?spec=");
    expect(l.elements).toBe(3);
  });
});
