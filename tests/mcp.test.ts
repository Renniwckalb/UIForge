import { describe, expect, it } from "vitest";
import { handleMcpPost, MCP_PROTOCOL_VERSIONS, TOOLS } from "../src/forge/mcp/server";
import { decodePayload } from "../src/forge/spec/link";

const rpc = async (body: unknown) => {
  const res = await handleMcpPost(new Request("https://forge.test/api/mcp", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify(body) }));
  return { status: res.status, json: res.status === 202 ? null : await res.json() };
};
const callTool = async (name: string, args: Record<string, unknown>) => (await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })).json;

const spec = {
  name: "BrandCard",
  children: [
    {
      brick: "shadcn.card",
      texts: { title: "Acme" },
      children: [
        { brick: "html.svg", props: { markup: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>' }, style: { width: "3rem", fg: "color.primary" }, texts: { label: "Acme logo" } },
        { brick: "shadcn.button", texts: { label: "Visit" } },
      ],
    },
  ],
};

describe("serveur MCP", () => {
  it("initialize : version négociée, outils et instructions", async () => {
    const { json } = await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
    expect(json.result.protocolVersion).toBe("2025-06-18");
    expect(json.result.capabilities.tools).toBeDefined();
    expect(json.result.serverInfo.name).toBe("ui-forge");
    expect(json.result.instructions).toMatch(/validate_spec/);
    const other = await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "1999-01-01" } });
    expect(other.json.result.protocolVersion).toBe(MCP_PROTOCOL_VERSIONS[0]);
  });

  it("notifications → 202 sans corps ; méthode inconnue → -32601 ; JSON invalide → -32700", async () => {
    expect((await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
    expect((await rpc({ jsonrpc: "2.0", id: 2, method: "nope" })).json.error.code).toBe(-32601);
    const res = await handleMcpPost(new Request("https://forge.test/api/mcp", { method: "POST", body: "{" }));
    expect((await res.json()).error.code).toBe(-32700);
  });

  it("tools/list : schémas d'entrée, sans fonction interne", async () => {
    const { json } = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    const names = json.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(TOOLS.map((t) => t.name));
    expect(names).toEqual(expect.arrayContaining(["list_bricks", "get_brick", "validate_spec", "create_link", "export_component", "prepare_svg"]));
    for (const t of json.result.tools) {
      expect(t.inputSchema.type).toBe("object");
      expect(t.run).toBeUndefined();
    }
  });

  it("lot JSON-RPC : une réponse par requête", async () => {
    const { json } = await rpc([{ jsonrpc: "2.0", id: "a", method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: "b", method: "ping" }]);
    expect(json.map((r: { id: string }) => r.id)).toEqual(["a", "b"]);
  });

  it("list_bricks et get_brick (suggestion si l'id est faux)", async () => {
    const list = await callTool("list_bricks", {});
    expect(list.result.content[0].text).toContain("`html.svg`");
    expect(list.result.structuredContent.bricks.length).toBeGreaterThan(20);
    const b = await callTool("get_brick", { ids: ["shadcn.button", "html.svg"] });
    expect(b.result.content[0].text).toMatch(/variant/);
    expect(b.result.content[0].text).toMatch(/currentColor/);
    const bad = await callTool("get_brick", { ids: ["shadcn.btn"] });
    expect(bad.result.isError).toBe(true);
    expect(bad.result.content[0].text).toContain("shadcn.button");
    expect((await callTool("get_brick", {})).error.code).toBe(-32602);
  });

  it("validate_spec : plan du composant, ou erreurs avec chemins JSON (isError)", async () => {
    const ok = await callTool("validate_spec", { spec });
    expect(ok.result.isError).toBeUndefined();
    expect(ok.result.structuredContent.valid).toBe(true);
    expect(ok.result.content[0].text).toContain('- html.svg "Acme logo"');
    const bad = await callTool("validate_spec", { spec: { name: "X", children: [{ brick: "shadcn.button", props: { size: "huge" } }] } });
    expect(bad.result.isError).toBe(true);
    expect(bad.result.structuredContent.errors[0]).toMatch(/^children\[0\]\.props\.size/);
    const svg = await callTool("validate_spec", { spec: { name: "X", children: [{ brick: "html.svg", props: { markup: '<svg><script>alert(1)</script></svg>' } }] } });
    expect(svg.result.structuredContent.errors[0]).toMatch(/props\.markup: <script> is not allowed/);
  });

  it("prepare_svg : balisage nettoyé, recoloration", async () => {
    const r = await callTool("prepare_svg", { markup: '<svg width="10" height="10"><rect fill="#f00" onclick="x()"/></svg>', recolor: true });
    expect(r.result.structuredContent.markup).toContain('viewBox="0 0 10 10"');
    expect(r.result.structuredContent.markup).toContain('fill="currentColor"');
    expect(r.result.content[0].text).toMatch(/onclick/);
    expect((await callTool("prepare_svg", { markup: "<div/>" })).result.isError).toBe(true);
  });

  it("create_link : lien de création décodable, origine de la requête", async () => {
    const r = await callTool("create_link", { spec, locale: "fr" });
    const url: string = r.result.structuredContent.url;
    expect(url.startsWith("https://forge.test/new#spec=z.")).toBe(true);
    expect(JSON.parse(await decodePayload(url.split("#spec=")[1]))).toEqual(spec);
  });

  it("export_component : fichiers React, filtrables", async () => {
    const all = await callTool("export_component", { spec });
    expect(Object.keys(all.result.structuredContent.files)).toEqual(expect.arrayContaining(["index.tsx", "styles.css", "ui/card.tsx"]));
    expect(all.result.structuredContent.files["index.tsx"]).toContain('aria-label="Acme logo"');
    const comp = await callTool("export_component", { spec, files: "component", language: "jsx" });
    expect(Object.keys(comp.result.structuredContent.files).sort()).toEqual(["index.jsx", "styles.css"]);
    expect((await callTool("export_component", { spec, format: "vue" })).error.code).toBe(-32602);
  });

  it("render_preview : arguments et spec validés avant de lancer un navigateur", async () => {
    expect((await callTool("render_preview", { spec, viewport: "watch" })).error.code).toBe(-32602);
    expect((await callTool("render_preview", { spec, viewport: 5000 })).error.code).toBe(-32602);
    expect((await callTool("render_preview", { spec, scheme: "sepia" })).error.code).toBe(-32602);
    const bad = await callTool("render_preview", { spec: { name: "X", children: [{ brick: "lucide.icon", props: { name: "Nope" } }] } });
    expect(bad.result.isError).toBe(true);
    expect(bad.result.structuredContent.errors[0]).toMatch(/props\.name: unknown Lucide icon/);
  });

  it("ressources : guide et schéma", async () => {
    const { json } = await rpc({ jsonrpc: "2.0", id: 9, method: "resources/read", params: { uri: "ui-forge://schema" } });
    expect(JSON.parse(json.result.contents[0].text).$defs["html.svg"]).toBeDefined();
    expect((await rpc({ jsonrpc: "2.0", id: 10, method: "resources/read", params: { uri: "ui-forge://nope" } })).json.error.code).toBe(-32002);
  });
});
