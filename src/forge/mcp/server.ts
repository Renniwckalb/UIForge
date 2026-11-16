/**
 * Serveur MCP (Model Context Protocol) de UI Forge, servi sur /api/mcp en « Streamable HTTP » sans état.
 *
 * Un agent (Claude Code, Claude Desktop, Cursor…) s'y connecte et découvre seul les outils :
 *   list_bricks → get_brick → (prepare_svg) → validate_spec → create_link / export_component
 * Tout repose sur le code existant (registre des briques, spec, API d'export) : rien n'est stocké,
 * aucune session n'est ouverte, chaque requête POST porte un message JSON-RPC 2.0 (ou un lot).
 *
 * Implémentation volontairement minimale et sans dépendance : initialize, ping, tools/*, resources/*.
 */
import { ALL_BRICKS, FAMILIES, findBrick } from "../bricks/registry";
import type { BrickDefinition } from "../bricks/types";
import { SVG_BRICK_ID } from "../bricks/defs/svg";
import { ANIMATION_PRESETS, BREAKPOINTS, STYLE_KEYS, STYLE_STATES, type ComponentDoc, type Node } from "../model/types";
import { COLOR_TOKENS, defaultTheme, STYLE_TOKEN_GROUP, tokensOfGroup } from "../tokens/theme";
import { ApiError, makeLink, runExport, toDoc } from "../export/api";
import { decodePayload, MAX_SPEC_BYTES } from "../spec/link";
import { brickDoc, brickSchema, jsonSchema, llmsTxt } from "../spec/docs";
import { defaultSlot, docToSpec, SPEC_FORMAT } from "../spec/spec";
import { isFatal, prepareSvg, recolorSvg, serializeSvg, svgIssueMessage } from "../svg/svg";
import { DEFAULT_LOCALE, isLocale, type Locale } from "../../i18n/core";
import { ICON_BRICK_ID } from "../bricks/defs/icon";
import { closest, LUCIDE_ICON_NAMES, LUCIDE_VERSION, searchIcons } from "../icons/lucide";
import { VIEWPORT_WIDTHS } from "../runtime/viewport";
import { PreviewUnavailable, renderPreview } from "./preview";

export const MCP_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "ui-forge", title: "UI Forge", version: "0.1.0" };

const INSTRUCTIONS = `UI Forge builds reusable React components from a JSON "spec" (a tree of bricks: shadcn/ui, Radix UI, Base UI, cmdk, NumberFlow, Magic UI, inline SVG) and exports them as React/TypeScript or as a dependency-free Web Component.
Workflow: 1) list_bricks, 2) get_brick for the bricks you plan to use (props, texts, slots, style keys), 3) get_style_tokens for theme tokens, 4) validate_spec until it returns no error (errors carry JSON paths such as children[0].props.variant), 5) render_preview to look at the result (mobile/desktop, light/dark) and iterate on the design, 6) create_link to give the user a link that opens the component in the studio, or export_component to get the code files.
For icons use the lucide.icon brick (props.name, e.g. "ArrowRight"): find names with search_icons.
For drawings, logos or illustrations use the html.svg brick: check your markup with prepare_svg first (scripts, event handlers and external references are rejected; use currentColor so it follows the text color, and size it with style.width).
Full guide: get_guide (or resource ui-forge://guide).`;

/* ——— JSON-RPC ——— */

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> };
type JsonRpcResponse = { jsonrpc: "2.0"; id: JsonRpcId; result?: unknown; error?: { code: number; message: string; data?: unknown } };

class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

/* ——— Outils ——— */

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
type ToolResult = { content: Content[]; structuredContent?: Record<string, unknown>; isError?: boolean };
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  run: (args: Record<string, unknown>, origin: string) => Promise<ToolResult> | ToolResult;
};

const SPEC_INPUT = {
  description: `Component spec (format ${SPEC_FORMAT}): { name, theme?, root?, children: Node[] }. A JSON string, base64url or z.-compressed payload is also accepted. See get_guide.`,
  anyOf: [{ type: "object" }, { type: "string" }],
};
const LOCALE_INPUT = { type: "string", enum: ["en", "fr", "zh"], description: "Language of default texts, README and code comments (default en)" };
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const text = (t: string, structured?: Record<string, unknown>): ToolResult => ({ content: [{ type: "text", text: t }], ...(structured ? { structuredContent: structured } : {}) });
const toolError = (t: string, structured?: Record<string, unknown>): ToolResult => ({ ...text(t, structured), isError: true });

function locale(args: Record<string, unknown>): Locale {
  if (args.locale === undefined) return DEFAULT_LOCALE;
  if (typeof args.locale !== "string" || !isLocale(args.locale)) throw new RpcError(-32602, 'locale must be "en", "fr" or "zh"');
  return args.locale;
}

async function specArg(args: Record<string, unknown>): Promise<unknown> {
  const s = args.spec;
  if (s === undefined) throw new RpcError(-32602, "Missing argument: spec");
  if (typeof s !== "string") {
    if (JSON.stringify(s).length > MAX_SPEC_BYTES) throw new RpcError(-32602, "spec too large (max 1 MB)");
    return s;
  }
  try {
    const t = await decodePayload(s);
    if (t.length > MAX_SPEC_BYTES) throw new Error("too large");
    return JSON.parse(t);
  } catch {
    throw new RpcError(-32602, "spec must be a JSON object (or a JSON string, base64url or z.-compressed payload)");
  }
}

function brickSummary(b: BrickDefinition) {
  return {
    id: b.id,
    label: b.label,
    family: b.family,
    library: b.library.name,
    description: b.description,
    slots: Object.keys(b.slots ?? {}),
    children: defaultSlot(b),
    texts: b.texts.map((t) => t.key),
    clickable: !!b.clickable,
    target: b.state?.kind === "open" ? "open/close/toggle" : b.state?.kind === "value" ? "setValue" : null,
  };
}

/** Plan du composant validé : une ligne par élément, indentée */
function outline(doc: ComponentDoc): string[] {
  const lines: string[] = [];
  const visit = (n: Node, depth: number, slot: string) => {
    const label = n.texts.title?.value ?? n.texts.label?.value ?? n.texts.text?.value ?? "";
    lines.push(`${"  ".repeat(depth)}- ${n.brick}${slot && slot !== "children" ? ` [${slot}]` : ""}${label && typeof label === "string" ? ` "${label.slice(0, 40)}"` : ""}`);
    for (const [s, ids] of Object.entries(n.slots)) for (const id of ids) if (doc.nodes[id]) visit(doc.nodes[id], depth + 1, s);
  };
  visit(doc.nodes[doc.rootId], 0, "");
  return lines;
}

function diagnosticsOf(e: unknown): { message: string }[] {
  if (e instanceof ApiError) return e.diagnostics.length ? e.diagnostics.map((d) => ({ message: d.message })) : [{ message: e.message }];
  return [{ message: e instanceof Error ? e.message : String(e) }];
}

function invalid(e: unknown): ToolResult {
  const diags = diagnosticsOf(e);
  return toolError(`Invalid spec — fix these JSON paths and retry:\n${diags.map((d) => `- ${d.message}`).join("\n")}`, { valid: false, errors: diags.map((d) => d.message) });
}

export const TOOLS: Tool[] = [
  {
    name: "list_bricks",
    title: "List bricks",
    description: "List the bricks (building blocks) a component can be made of, with their slots and texts. Call get_brick for props and style keys.",
    inputSchema: { type: "object", properties: { family: { type: "string", enum: FAMILIES.map((f) => f.id), description: "Only this family" } }, additionalProperties: false },
    annotations: READ_ONLY,
    run: (args) => {
      if (args.family !== undefined && !FAMILIES.some((f) => f.id === args.family)) throw new RpcError(-32602, `family must be one of ${FAMILIES.map((f) => f.id).join(", ")}`);
      const bricks = ALL_BRICKS.filter((b) => !args.family || b.family === args.family);
      const lines = FAMILIES.filter((f) => bricks.some((b) => b.family === f.id)).flatMap((f) => [
        `## ${f.label} — ${f.hint}`,
        ...bricks
          .filter((b) => b.family === f.id)
          .map((b) => {
            const s = brickSummary(b);
            const extra = [s.slots.length ? `slots: ${s.slots.join(", ")}` : "", s.texts.length ? `texts: ${s.texts.join(", ")}` : "", s.clickable ? "onClick" : "", s.target ? `target of ${s.target}` : ""].filter(Boolean).join(" · ");
            return `- \`${b.id}\` ${b.label}: ${b.description}${extra ? ` (${extra})` : ""}`;
          }),
        "",
      ]);
      return text(lines.join("\n").trim(), { bricks: bricks.map(brickSummary) });
    },
  },
  {
    name: "get_brick",
    title: "Get brick details",
    description: "Full reference of one or more bricks: props (types, allowed values, defaults), texts, slots, supported style keys and states, and the JSON Schema of a spec node.",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12, description: 'Brick ids, e.g. ["shadcn.card", "shadcn.button"]' } },
      required: ["ids"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    run: (args) => {
      if (!Array.isArray(args.ids) || !args.ids.length || !args.ids.every((x) => typeof x === "string")) throw new RpcError(-32602, "ids must be a non-empty array of brick ids");
      const ids = [...new Set(args.ids as string[])].slice(0, 12);
      const unknown = ids.filter((id) => !findBrick(id) || id === "raw.jsx");
      if (unknown.length === ids.length)
        return toolError(unknown.map((id) => `Unknown brick "${id}". Did you mean: ${closest(id, ALL_BRICKS.map((b) => b.id)).join(", ")}?`).join("\n"));
      const bricks = ids.filter((id) => !unknown.includes(id)).map((id) => findBrick(id)!);
      const parts = bricks.map((b) => {
        const svg = b.id === SVG_BRICK_ID ? "\n\nSVG: put the whole <svg> markup in props.markup (no xmlns needed). Use prepare_svg to check it. Use currentColor for colors that should follow style.fg, set style.width for the size (height follows the viewBox ratio), and texts.label for an accessible name (empty = decorative)." : "";
        const icon =
          b.id === ICON_BRICK_ID
            ? `\n\nIcon names: any of the ${LUCIDE_ICON_NAMES.length} Lucide icons in PascalCase (lucide-react ${LUCIDE_VERSION}); find them with search_icons. The icon takes style.fg as color and style.width as size; texts.label gives it an accessible name (empty = decorative).`
            : "";
        return `${brickDoc(b)}${icon}${svg}\n\nSpec node schema:\n\`\`\`json\n${JSON.stringify(brickSchema(b))}\n\`\`\``;
      });
      if (unknown.length) parts.push(unknown.map((id) => `Unknown brick "${id}". Did you mean: ${closest(id, ALL_BRICKS.map((b) => b.id)).join(", ")}?`).join("\n"));
      return text(parts.join("\n\n---\n\n"), { bricks: bricks.map((b) => ({ ...brickSummary(b), props: b.props, styleKeys: b.styleTargets, states: b.states.filter((s) => s !== "loading") })), unknown });
    },
  },
  {
    name: "get_style_tokens",
    title: "Get style tokens",
    description: "Theme tokens usable as style values (they follow light/dark mode), style keys, style layers (states, breakpoints) and animation presets.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
    run: () => {
      const theme = defaultTheme();
      const byKey = Object.fromEntries(
        STYLE_KEYS.map((k) => {
          const g = STYLE_TOKEN_GROUP[k];
          return [k, g ? tokensOfGroup(theme, g).map(([t, v]) => ({ token: t, value: v })) : []];
        }),
      );
      const lines = [
        `Style values: a theme token below, or any CSS value ("22rem", "#2563eb").`,
        `Layers: base (mobile), states ${STYLE_STATES.join(", ")}, min-width breakpoints ${BREAKPOINTS.join(", ")}. Example: { "px": "space.4", "hover": { "bg": "color.accent" }, "md": { "px": "space.8" } }`,
        `Color tokens: ${COLOR_TOKENS.map((c) => `color.${c}`).join(", ")}`,
        ...STYLE_KEYS.map((k) => `- ${k}: ${byKey[k].length ? byKey[k].map((t) => `${t.token} (${t.value})`).join(", ") : "CSS value only"}`),
        `Animation presets: ${ANIMATION_PRESETS.join(", ")} — on: mount | hover | in-view`,
      ];
      return text(lines.join("\n"), { styleKeys: byKey, colorTokens: COLOR_TOKENS.map((c) => `color.${c}`), states: [...STYLE_STATES], breakpoints: [...BREAKPOINTS], animations: [...ANIMATION_PRESETS] });
    },
  },
  {
    name: "prepare_svg",
    title: "Check an SVG",
    description: "Validate and clean SVG markup for the html.svg brick. Returns the canonical markup to put in props.markup and what would be removed (scripts, event handlers, external references). Optionally recolors fills and strokes to currentColor.",
    inputSchema: {
      type: "object",
      properties: { markup: { type: "string", description: "The <svg>…</svg> markup" }, recolor: { type: "boolean", description: "Replace fill/stroke colors with currentColor (default false)" } },
      required: ["markup"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    run: (args) => {
      if (typeof args.markup !== "string") throw new RpcError(-32602, "markup must be a string");
      const p = prepareSvg(args.markup);
      const issues = p.issues.map(svgIssueMessage);
      if (!p.tree) return toolError(`Unusable SVG: ${issues.join("; ")}`, { valid: false, issues });
      const markup = args.recolor === true ? serializeSvg(recolorSvg(p.tree)) : p.markup;
      const blocking = p.issues.filter((i) => !isFatal(i) && i.code !== "viewBox");
      return text(
        [blocking.length ? `Removed (a spec containing them is rejected — use the cleaned markup below):\n${blocking.map((i) => `- ${svgIssueMessage(i)}`).join("\n")}` : "Valid SVG.", ...(p.issues.some((i) => i.code === "viewBox") ? ["Warning: no viewBox, add one so it scales."] : []), "```svg", markup, "```"].join("\n"),
        { valid: true, markup, issues },
      );
    },
  },
  {
    name: "search_icons",
    title: "Search icons",
    description: "Find Lucide icon names for the lucide.icon brick (props.name). Searches English words in icon names, with a few synonyms (delete → Trash, settings → Settings/Cog…).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: 'Words, e.g. "arrow right", "user", "shopping cart"' },
        limit: { type: "number", minimum: 1, maximum: 200, description: "Max results (default 30)" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    run: (args) => {
      if (typeof args.query !== "string") throw new RpcError(-32602, "query must be a string");
      const limit = typeof args.limit === "number" ? Math.max(1, Math.min(200, Math.floor(args.limit))) : 30;
      const names = searchIcons(args.query, limit);
      if (!names.length) return text(`No icon matches "${args.query}". Try other English words (closest names: ${closest(args.query, LUCIDE_ICON_NAMES).join(", ")}).`, { icons: [] });
      return text(`${names.length} icon${names.length > 1 ? "s" : ""} for "${args.query}": ${names.join(", ")}\nUse one as { "brick": "lucide.icon", "props": { "name": "${names[0]}" } }.`, { icons: names });
    },
  },
  {
    name: "render_preview",
    title: "Render a preview",
    description:
      'Render a component spec in a real browser and return a PNG screenshot, to check the visual result and iterate. viewport: "mobile" (390px), "tablet" (820px), "desktop" (1280px) or a width in px. overlays: "closed" (as the user first sees it) or "open" (dialogs, drawers and popovers shown open, inline).',
    inputSchema: {
      type: "object",
      properties: {
        spec: SPEC_INPUT,
        viewport: { anyOf: [{ type: "string", enum: Object.keys(VIEWPORT_WIDTHS) }, { type: "number", minimum: 280, maximum: 1920 }], description: "Default mobile" },
        scheme: { type: "string", enum: ["light", "dark"], description: "Color scheme (default: the theme's default scheme)" },
        overlays: { type: "string", enum: ["closed", "open"], description: "Default closed" },
        locale: LOCALE_INPUT,
      },
      required: ["spec"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    run: async (args, origin) => {
      const spec = await specArg(args);
      const viewport = args.viewport ?? "mobile";
      const validViewport = (typeof viewport === "number" && viewport >= 280 && viewport <= 1920) || (typeof viewport === "string" && viewport in VIEWPORT_WIDTHS);
      if (!validViewport) throw new RpcError(-32602, 'viewport must be "mobile", "tablet", "desktop" or a width between 280 and 1920');
      if (args.scheme !== undefined && args.scheme !== "light" && args.scheme !== "dark") throw new RpcError(-32602, 'scheme must be "light" or "dark"');
      if (args.overlays !== undefined && args.overlays !== "closed" && args.overlays !== "open") throw new RpcError(-32602, 'overlays must be "closed" or "open"');
      let doc: ComponentDoc;
      try {
        doc = toDoc(spec, locale(args));
      } catch (e) {
        return invalid(e);
      }
      const scheme = (args.scheme as "light" | "dark" | undefined) ?? doc.theme.defaultScheme;
      const overlays = (args.overlays as "closed" | "open" | undefined) ?? "closed";
      try {
        const r = await renderPreview({ spec: docToSpec(doc), origin, viewport: viewport as keyof typeof VIEWPORT_WIDTHS | number, scheme, overlays });
        return {
          content: [
            { type: "image", data: r.png.toString("base64"), mimeType: "image/png" },
            { type: "text", text: `"${doc.name}" at ${r.viewportWidth}px, ${scheme} scheme, overlays ${overlays} — ${r.width}×${r.height}px${r.truncated ? " (cut at 3000px)" : ""}.` },
          ],
          structuredContent: { name: doc.name, width: r.width, height: r.height, viewportWidth: r.viewportWidth, scheme, overlays, truncated: r.truncated },
        };
      } catch (e) {
        return toolError(e instanceof PreviewUnavailable ? e.message : `Preview failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      }
    },
  },
  {
    name: "validate_spec",
    title: "Validate a spec",
    description: "Check a component spec without exporting it. Returns every error with its JSON path, or the outline of the component and the normalized spec.",
    inputSchema: { type: "object", properties: { spec: SPEC_INPUT, locale: LOCALE_INPUT }, required: ["spec"], additionalProperties: false },
    annotations: READ_ONLY,
    run: async (args) => {
      const spec = await specArg(args);
      let doc: ComponentDoc;
      try {
        doc = toDoc(spec, locale(args));
      } catch (e) {
        return invalid(e);
      }
      const lines = outline(doc);
      return text(`Valid spec "${doc.name}" (${Object.keys(doc.nodes).length} elements):\n${lines.join("\n")}`, { valid: true, name: doc.name, elements: Object.keys(doc.nodes).length, outline: lines, spec: docToSpec(doc) });
    },
  },
  {
    name: "create_link",
    title: "Create a studio link",
    description: "Validate a spec and return a link that opens the component in the UI Forge studio (the user confirms before it is saved in their browser). Give the url to the user.",
    inputSchema: { type: "object", properties: { spec: SPEC_INPUT, locale: LOCALE_INPUT }, required: ["spec"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: async (args, origin) => {
      const spec = await specArg(args);
      try {
        const l = await makeLink(origin, spec, locale(args));
        return text(`Open this link to create "${l.name}" (${l.elements} elements) in the studio:\n${l.url}`, { url: l.url, ...(l.queryUrl ? { queryUrl: l.queryUrl } : {}), name: l.name, elements: l.elements });
      } catch (e) {
        return invalid(e);
      }
    },
  },
  {
    name: "export_component",
    title: "Export a component",
    description:
      'Export a spec as code. format "react" (default): folder with index.tsx, styles.css, ui/* (copied shadcn/Magic UI sources), README; needs Tailwind CSS v4 in the host project. format "web-component": dependency-free custom element usable in any page. Write the returned files under the returned folder.',
    inputSchema: {
      type: "object",
      properties: {
        spec: SPEC_INPUT,
        format: { type: "string", enum: ["react", "web-component"] },
        language: { type: "string", enum: ["tsx", "jsx"], description: "React only (default tsx)" },
        locale: LOCALE_INPUT,
        files: { type: "string", enum: ["all", "component"], description: '"component" returns only the component code and styles (default all)' },
      },
      required: ["spec"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
    run: async (args) => {
      const spec = await specArg(args);
      const format = args.format ?? "react";
      const language = args.language ?? "tsx";
      if (format !== "react" && format !== "web-component") throw new RpcError(-32602, 'format must be "react" or "web-component"');
      if (language !== "tsx" && language !== "jsx") throw new RpcError(-32602, 'language must be "tsx" or "jsx"');
      if (args.files !== undefined && args.files !== "all" && args.files !== "component") throw new RpcError(-32602, 'files must be "all" or "component"');
      let r: Awaited<ReturnType<typeof runExport>>;
      try {
        r = await runExport({ input: spec, format, language, locale: locale(args), output: "json" });
      } catch (e) {
        if (e instanceof ApiError && e.status === 422) return invalid(e);
        return toolError(e instanceof Error ? e.message : String(e));
      }
      const files = args.files === "component" ? Object.fromEntries(Object.entries(r.files).filter(([p]) => /(^|\/)(index\.(tsx|jsx|js|d\.ts)|styles\.css)$/.test(p))) : r.files;
      const body = Object.entries(files).map(([p, c]) => `### ${r.folder}/${p}\n\`\`\`${p.split(".").pop()}\n${c}\n\`\`\``);
      const head = [`Exported "${r.name}" as ${format} into folder ${r.folder}/ (${Object.keys(files).length} files).`, r.install ? `Install: ${r.install}` : "", ...(r.usage ?? []).map((u) => `Usage:\n${u}`)].filter(Boolean);
      return text([...head, "", ...body].join("\n"), { name: r.name, folder: r.folder, format, install: r.install, usage: r.usage, files });
    },
  },
  {
    name: "get_guide",
    title: "Get the full guide",
    description: "The complete agent guide (llms.txt): spec format, every brick, tokens, links, HTTP API and full examples.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
    run: (_args, origin) => text(llmsTxt(origin)),
  },
];

const RESOURCES = [
  { uri: "ui-forge://guide", name: "guide", title: "UI Forge agent guide", description: "Spec format, bricks, tokens and examples (llms.txt)", mimeType: "text/markdown" },
  { uri: "ui-forge://schema", name: "schema", title: "Spec JSON Schema", description: "JSON Schema 2020-12 of the component spec", mimeType: "application/schema+json" },
];

/* ——— Dispatch ——— */

async function call(msg: JsonRpcRequest, origin: string): Promise<unknown> {
  const params = msg.params ?? {};
  switch (msg.method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return {
        protocolVersion: MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false, subscribe: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      };
    }
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS.map(({ run: _run, ...t }) => (void _run, t)) };
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) throw new RpcError(-32602, `Unknown tool: ${String(params.name)} (available: ${TOOLS.map((t) => t.name).join(", ")})`);
      const args = params.arguments ?? {};
      if (typeof args !== "object" || Array.isArray(args)) throw new RpcError(-32602, "arguments must be an object");
      return await tool.run(args as Record<string, unknown>, origin);
    }
    case "resources/list":
      return { resources: RESOURCES };
    case "resources/templates/list":
      return { resourceTemplates: [] };
    case "resources/read": {
      if (params.uri === "ui-forge://guide") return { contents: [{ uri: params.uri, mimeType: "text/markdown", text: llmsTxt(origin) }] };
      if (params.uri === "ui-forge://schema") return { contents: [{ uri: params.uri, mimeType: "application/schema+json", text: JSON.stringify(jsonSchema(origin), null, 2) }] };
      throw new RpcError(-32002, `Resource not found: ${String(params.uri)}`);
    }
    case "prompts/list":
      return { prompts: [] };
    case "logging/setLevel":
      return {};
  }
  throw new RpcError(-32601, `Method not found: ${msg.method}`);
}

async function handleMessage(raw: unknown, origin: string): Promise<JsonRpcResponse | null> {
  const isObj = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const msg = raw as JsonRpcRequest;
  const id: JsonRpcId = isObj && (typeof msg.id === "string" || typeof msg.id === "number") ? msg.id : null;
  if (!isObj || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    // réponse d'un client (aucune requête serveur → client n'est émise) : ignorée
    if (isObj && msg.jsonrpc === "2.0" && ("result" in msg || "error" in msg)) return null;
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid JSON-RPC request" } };
  }
  const isNotification = !("id" in msg) || msg.id === undefined;
  try {
    const result = await call(msg, origin);
    return isNotification ? null : { jsonrpc: "2.0", id, result };
  } catch (e) {
    if (isNotification) return null;
    if (e instanceof RpcError) return { jsonrpc: "2.0", id, error: { code: e.code, message: e.message, ...(e.data !== undefined ? { data: e.data } : {}) } };
    console.error("[mcp]", e);
    return { jsonrpc: "2.0", id, error: { code: -32603, message: e instanceof Error ? e.message : String(e) } };
  }
}

export const MCP_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

/** Requête HTTP POST /api/mcp → réponse JSON (ou 202 pour des notifications seules) */
export async function handleMcpPost(req: Request): Promise<Response> {
  const origin = new URL(req.url).origin;
  const textBody = await req.text();
  if (textBody.length > MAX_SPEC_BYTES * 2) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large (max 2 MB)" } }, { status: 413, headers: MCP_CORS });
  let body: unknown;
  try {
    body = JSON.parse(textBody);
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: the body must be JSON-RPC 2.0" } }, { status: 400, headers: MCP_CORS });
  }
  const batch = Array.isArray(body);
  const messages: unknown[] = batch ? (body as unknown[]) : [body];
  if (batch && !messages.length) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Empty batch" } }, { status: 400, headers: MCP_CORS });
  const responses = (await Promise.all(messages.map((m) => handleMessage(m, origin)))).filter((r): r is JsonRpcResponse => r !== null);
  if (!responses.length) return new Response(null, { status: 202, headers: MCP_CORS });
  return Response.json(batch ? responses : responses[0], { headers: MCP_CORS });
}
