/**
 * Documentation du format spec pour les agents IA, générée depuis le registre des briques :
 *  - jsonSchema() : JSON Schema 2020-12 (servi sur /schema.json)
 *  - llmsTxt()    : mode d'emploi Markdown (servi sur /llms.txt)
 * Toujours en anglais (langue de travail des agents) et toujours à jour avec les briques disponibles.
 */
import { ALL_BRICKS } from "../bricks/registry";
import type { BrickDefinition, PropField } from "../bricks/types";
import { TEMPLATES } from "../model/templates";
import { ANIMATION_PRESETS, BREAKPOINTS, STYLE_KEYS, STYLE_STATES, type StyleKey } from "../model/types";
import { COLOR_TOKENS, defaultTheme, STYLE_TOKEN_GROUP, tokensOfGroup } from "../tokens/theme";
import { getLocale, setCurrentLocale } from "../../i18n/core";
import { defaultSlot, docToSpec, SPEC_FORMAT, type ComponentSpec } from "./spec";
import { LUCIDE_ICON_NAMES, LUCIDE_VERSION } from "../icons/lucide";

const LAYERS = ["base", ...STYLE_STATES, ...BREAKPOINTS];

export function tokensFor(key: StyleKey): string[] {
  const g = STYLE_TOKEN_GROUP[key];
  return g ? tokensOfGroup(defaultTheme(), g).map(([t]) => t) : [];
}

function styleKeyDescription(key: StyleKey) {
  const tokens = tokensFor(key);
  return tokens.length ? `Theme token (${tokens.join(", ")}) or any CSS value` : "CSS value";
}

function propSchema(f: PropField): Record<string, unknown> {
  const d = { description: `${f.label}${f.help ? ` — ${f.help}` : ""} (default: ${JSON.stringify(f.default)})` };
  if (f.type === "enum") return { ...d, enum: f.options.map((o) => o.value) };
  if (f.type === "boolean") return { ...d, type: "boolean" };
  if (f.type === "number") return { ...d, type: "number", minimum: f.min, maximum: f.max };
  return { ...d, type: "string" };
}

function styleSchema(b: BrickDefinition) {
  const decl = Object.fromEntries(b.styleTargets.map((k) => [k, { type: "string", description: styleKeyDescription(k) }]));
  const layer = { type: "object", additionalProperties: false, properties: decl };
  const layers = Object.fromEntries(LAYERS.filter((l) => l === "base" || (BREAKPOINTS as readonly string[]).includes(l) || b.states.includes(l as never)).map((l) => [l, layer]));
  return {
    type: "object",
    additionalProperties: false,
    description: "Style keys apply to the base layer; nest them under hover/focus/active/disabled (states) or sm/md/lg/xl (min-width breakpoints) to override.",
    properties: { ...decl, ...layers },
  };
}

export function brickSchema(b: BrickDefinition) {
  const props: Record<string, unknown> = {
    brick: { const: b.id, description: `${b.label} — ${b.description}` },
    ref: { type: "string", description: "Local id used as onClick target" },
    name: { type: "string", description: "Layer name shown in the studio" },
  };
  if (Object.keys(b.props).length) props.props = { type: "object", additionalProperties: false, properties: Object.fromEntries(Object.entries(b.props).map(([k, f]) => [k, propSchema(f)])) };
  if (b.texts.length) {
    props.texts = {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(b.texts.map((t) => [t.key, t.kind === "list" ? { type: "array", items: { type: "string" }, description: t.label } : { type: "string", description: t.label }])),
    };
    props.textProps = {
      type: "object",
      additionalProperties: false,
      description: "Exported prop name for each text (default: suggested name), or false to keep it internal",
      properties: Object.fromEntries(b.texts.map((t) => [t.key, { anyOf: [{ type: "string", pattern: "^[A-Za-z_$][\\w$]*$" }, { const: false }] }])),
    };
  }
  const exposable = Object.entries(b.props).filter(([, f]) => "exposable" in f && f.exposable).map(([k]) => k);
  if (exposable.length) props.exposeProps = { type: "object", additionalProperties: false, description: "Brick props exposed as component props: { prop: propName }", properties: Object.fromEntries(exposable.map((k) => [k, { type: "string" }])) };
  if (b.styleTargets.length) props.style = styleSchema(b);
  props.animation = { $ref: "#/$defs/animation" };
  props.className = { type: "string", description: "Extra Tailwind classes" };
  const main = defaultSlot(b);
  if (main) props.children = { type: "array", items: { $ref: "#/$defs/node" }, description: `Children of the "${main}" slot` };
  if (b.slots) props.slots = { type: "object", additionalProperties: false, properties: Object.fromEntries(Object.entries(b.slots).map(([s, d]) => [s, { type: "array", items: { $ref: "#/$defs/node" }, ...(d.max ? { maxItems: d.max } : {}), description: `${d.label}${d.accepts === "inline" ? " — one simple element only (no container, no overlay)" : ""}` }])) };
  if (b.clickable) props.onClick = { type: "array", items: { $ref: "#/$defs/action" } };
  return { type: "object", required: ["brick"], additionalProperties: false, properties: props };
}

export function jsonSchema(origin = ""): Record<string, unknown> {
  const stack = ALL_BRICKS.find((b) => b.id === "layout.stack")!;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${origin}/schema.json`,
    title: "UI Forge component spec",
    description: `Describes a React component as a tree of bricks. Open ${origin}/new?spec=<url-encoded JSON> to create it. Guide: ${origin}/llms.txt`,
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      $schema: { type: "string" },
      format: { const: SPEC_FORMAT },
      name: { type: "string", description: "Component name in PascalCase, e.g. PricingCard" },
      theme: { $ref: "#/$defs/theme" },
      root: {
        type: "object",
        additionalProperties: false,
        description: "The root container (a vertical layout.stack with padding)",
        properties: { props: brickSchema(stack).properties.props, style: styleSchema(stack), animation: { $ref: "#/$defs/animation" }, className: { type: "string" } },
      },
      children: { type: "array", items: { $ref: "#/$defs/node" } },
    },
    $defs: {
      node: { oneOf: ALL_BRICKS.map((b) => ({ $ref: `#/$defs/${b.id}` })) },
      ...Object.fromEntries(ALL_BRICKS.map((b) => [b.id, brickSchema(b)])),
      action: {
        oneOf: [
          { type: "object", required: ["action", "target"], additionalProperties: false, properties: { action: { enum: ["open", "close", "toggle"] }, target: { type: "string", description: "ref of a dialog, drawer, popover, collapsible or cmdk.dialog" } } },
          { type: "object", required: ["action", "target", "value"], additionalProperties: false, properties: { action: { const: "setValue" }, target: { type: "string", description: "ref of a numberflow.value" }, value: { type: "number" } } },
          { type: "object", required: ["action", "href"], additionalProperties: false, properties: { action: { const: "navigate" }, href: { type: "string" }, newTab: { type: "boolean" } } },
        ],
      },
      animation: {
        anyOf: [
          { enum: [...ANIMATION_PRESETS] },
          {
            type: "object",
            required: ["preset"],
            additionalProperties: false,
            properties: {
              preset: { enum: [...ANIMATION_PRESETS] },
              on: { enum: ["mount", "hover", "in-view"] },
              durationMs: { type: "number" },
              delayMs: { type: "number" },
              easing: { type: "string" },
              reducedMotion: { enum: ["disable", "fade-only"] },
            },
          },
        ],
      },
      theme: {
        type: "object",
        additionalProperties: false,
        properties: {
          preset: { enum: ["default", "beautiful-ui"] },
          defaultScheme: { enum: ["light", "dark"] },
          radius: { type: "string", description: "Base radius, e.g. 0.75rem" },
          colors: {
            type: "object",
            additionalProperties: false,
            properties: Object.fromEntries(["light", "dark"].map((s) => [s, { type: "object", additionalProperties: false, properties: Object.fromEntries(COLOR_TOKENS.map((c) => [c, { type: "string" }])) }])),
          },
          fonts: { type: "object", additionalProperties: false, properties: { sans: { type: "string" }, heading: { type: "string" }, mono: { type: "string" } } },
          exposeColors: { type: "object", additionalProperties: false, description: "{ colorToken: propName }", properties: Object.fromEntries(COLOR_TOKENS.map((c) => [c, { type: "string" }])) },
        },
      },
    },
  };
}

function fieldLine(k: string, f: PropField) {
  const type = f.type === "enum" ? f.options.map((o) => JSON.stringify(o.value)).join(" | ") : f.type === "number" ? `number ${f.min}–${f.max}` : f.type;
  return `\`${k}\`: ${type} = ${JSON.stringify(f.default)}${"exposable" in f && f.exposable ? " (exposable)" : ""}`;
}

export function brickDoc(b: BrickDefinition) {
  const lines = [`### \`${b.id}\` — ${b.label}`, "", b.description, ""];
  const main = defaultSlot(b);
  if (b.slots) lines.push(`- slots: ${Object.entries(b.slots).map(([s, d]) => `\`${s}\`${s === main ? " (= children)" : ""}${d.accepts === "inline" ? " (one simple element)" : ""}`).join(", ")}`);
  if (b.texts.length) lines.push(`- texts: ${b.texts.map((t) => `\`${t.key}\`${t.kind === "list" ? " (string[])" : ""}`).join(", ")}`);
  if (Object.keys(b.props).length) lines.push(`- props: ${Object.entries(b.props).map(([k, f]) => fieldLine(k, f)).join("; ")}`);
  if (b.styleTargets.length) lines.push(`- style: ${b.styleTargets.join(", ")}${b.states.length ? ` · states: ${b.states.filter((s) => s !== "loading").join(", ")}` : ""}`);
  if (b.clickable) lines.push("- onClick: supported");
  if (b.state?.kind === "open") lines.push("- can be the target of open / close / toggle (give it a `ref`)");
  if (b.state?.kind === "value") lines.push("- can be the target of setValue (give it a `ref`)");
  return lines.join("\n");
}

/** Exemples tirés des modèles du studio, toujours en anglais */
function examples(): { id: string; label: string; spec: ComponentSpec }[] {
  const prev = getLocale();
  try {
    setCurrentLocale("en");
    return ["pricing-card", "drawer-confirm"].map((id) => {
      const t = TEMPLATES.find((x) => x.id === id)!;
      return { id, label: t.label, spec: docToSpec(t.build()) };
    });
  } finally {
    setCurrentLocale(prev);
  }
}

export function llmsTxt(origin = ""): string {
  const ex = examples();
  const small = { name: "HelloCard", children: [{ brick: "shadcn.card", texts: { title: "Hello", description: "Made by an AI agent" }, style: { maxWidth: "24rem" }, children: [{ brick: "shadcn.button", texts: { label: "Get started" } }] }] };
  const link = `${origin}/new?spec=${encodeURIComponent(JSON.stringify(small))}`;
  const tokenLines = (["bg", "radius", "px", "shadow", "fontFamily", "fontSize"] as StyleKey[]).map((k) => `- ${k}: ${tokensFor(k).join(", ")}`);
  return `# UI Forge

> Visual studio that builds reusable React components (shadcn/ui, Radix UI, Base UI, cmdk, NumberFlow, Magic UI) and exports them as React/TypeScript or as a dependency-free Web Component. AI agents can create components by writing a JSON spec and giving the user a link.

## Create a component from a link

1. Write a spec (JSON, format \`${SPEC_FORMAT}\`, see below and ${origin}/schema.json).
2. Give the user one of these links; it opens a confirmation page, then the studio:
   - \`${origin}/new?spec=<encodeURIComponent(JSON)>\` — plain JSON in the query string
   - \`${origin}/new#spec=<JSON | base64url(JSON) | z.base64url(deflate-raw(JSON))>\` — the fragment is never sent to the server and allows longer specs
   - \`${origin}/new?src=<https URL of a .json file>\` — the file host must allow CORS (e.g. a raw GitHub gist)
3. Components are stored in the user's browser (IndexedDB); nothing is created without their confirmation.

The JSON may also be a full studio model (\`ComponentDoc\`, as shown in the studio's "JSON model" tab).

Example link: ${link}

## MCP server (recommended for agents)

UI Forge is also a Model Context Protocol server (Streamable HTTP, stateless): \`${origin}/api/mcp\`.

\`\`\`bash
claude mcp add --transport http ui-forge ${origin}/api/mcp
\`\`\`

Tools: \`list_bricks\`, \`get_brick\`, \`get_style_tokens\`, \`search_icons\`, \`prepare_svg\`, \`validate_spec\`, \`render_preview\` (PNG screenshot of the component, mobile/tablet/desktop, light/dark, overlays closed/open), \`create_link\`, \`export_component\`, \`get_guide\`.
Resources: \`ui-forge://guide\` (this document), \`ui-forge://schema\` (JSON Schema).

## HTTP API (stateless, CORS enabled, nothing is stored)

All endpoints accept POST with a JSON body, or GET with the same fields as query parameters
(\`spec\` then holds the JSON, base64url or z.-compressed payload). \`spec\` may be a spec or a full model.

### POST ${origin}/api/link — validate a spec and get its creation link

\`\`\`json
{ "spec": { "name": "HelloCard", "children": [] } }
\`\`\`
→ \`{ "url": "${origin}/new#spec=z.…", "queryUrl"?: "…", "name", "elements", "spec" }\` (\`spec\` = normalized spec).
Use it when you cannot compress the JSON yourself; give \`url\` to the user.

### POST ${origin}/api/export — get the exported code directly

\`\`\`json
{ "spec": { … }, "format": "react" | "web-component", "language": "tsx" | "jsx", "locale": "en" | "fr" | "zh", "output": "json" | "zip" }
\`\`\`
- \`format: "react"\` (default): React component folder (\`index.tsx\`, \`styles.css\`, \`ui/*\`, README) — needs Tailwind CSS v4 in the host project.
- \`format: "web-component"\`: dependency-free custom element (\`components/<name>/index.js\`, UMD, React wrapper, types) — works in any page or framework.
- \`output: "json"\` (default) → \`{ name, folder, format, files: { path: content }, install?, usage }\`; \`"zip"\` → the folder as a .zip file.
- \`locale\` sets the language of README files, code comments and default texts (default \`en\`).

Errors: 400 (bad request), 413 (too large), 422 \`{ error, diagnostics: [{ message: "children[0].props.variant: …" }] }\` (invalid spec — fix the reported JSON paths and retry).

## Spec format

\`\`\`ts
type Spec = {
  format?: "${SPEC_FORMAT}";
  name: string;                 // PascalCase component name
  theme?: {
    preset?: "default" | "beautiful-ui";
    defaultScheme?: "light" | "dark";
    radius?: string;            // e.g. "0.75rem"
    colors?: { light?: Record<ColorToken, string>; dark?: Record<ColorToken, string> };
    fonts?: { sans?: string; heading?: string; mono?: string };
    exposeColors?: Record<ColorToken, string>;   // { primary: "brandColor" } → prop
  };
  root?: { props?, style?, animation?, className? };   // root vertical stack (padding 1.5rem, gap 1rem)
  children?: Node[];
};
type Node = {
  brick: BrickId;               // see "Bricks" below
  ref?: string;                 // local id, target of onClick actions
  name?: string;                // layer name
  props?: Record<string, string | number | boolean>;
  texts?: Record<string, string | string[]>;     // every text becomes a component prop by default
  textProps?: Record<string, string | false>;    // rename the prop, or false to keep the text internal
  exposeProps?: Record<string, string>;          // { variant: "ctaVariant" } (exposable props only)
  style?: Style;
  animation?: Preset | { preset; on?: "mount" | "hover" | "in-view"; durationMs?; delayMs?; easing?; reducedMotion?: "disable" | "fade-only" };
  className?: string;           // extra Tailwind classes
  children?: Node[];            // main slot ("children", or "content" for overlays)
  slots?: Record<string, Node[]>;                // named slots, e.g. { trigger: [...], content: [...] }
  onClick?: ({ action: "open" | "close" | "toggle"; target: Ref } | { action: "setValue"; target: Ref; value: number } | { action: "navigate"; href: string; newTab?: boolean })[];
};
// Style: { key: value, hover: { key: value }, md: { key: value } }
// value = theme token (follows light/dark mode) or any CSS value ("22rem", "#2563eb", "0 2px 8px rgb(0 0 0 / .1)")
\`\`\`

- Style keys: ${STYLE_KEYS.join(", ")}. Layers: states ${STYLE_STATES.join(", ")} and min-width breakpoints ${BREAKPOINTS.join(", ")} (base = mobile).
- Color tokens: ${COLOR_TOKENS.map((c) => `color.${c}`).join(", ")}
${tokenLines.join("\n")}
- Animation presets: ${ANIMATION_PRESETS.join(", ")}
- Texts you omit keep the brick default; props you omit keep their default.
- Validation is strict: unknown bricks, props, texts, slots, style keys or tokens are reported with their JSON path on the confirmation page.

## Icons

Use the \`lucide.icon\` brick with any Lucide icon name in PascalCase (${LUCIDE_ICON_NAMES.length} icons, lucide-react ${LUCIDE_VERSION}, https://lucide.dev/icons):

\`\`\`json
{ "brick": "lucide.icon", "props": { "name": "ArrowRight", "strokeWidth": 1.5 }, "style": { "width": "1.25rem", "fg": "color.primary" }, "texts": { "label": "Next" } }
\`\`\`

- \`style.fg\` sets the color, \`style.width\` the size. \`texts.label\` is the accessible name; empty = decorative (\`aria-hidden\`).
- Unknown names are rejected with suggestions; old names (\`Trash2\`) are converted to the current one (\`Trash\`). The export imports \`<Name>Icon\` from \`lucide-react\`.
- Use an icon next to a text by placing both in a horizontal \`layout.stack\` (\`props.direction: "row"\`, \`props.align: "center"\`).

## Inline SVG (drawings, logos, illustrations)

Use the \`html.svg\` brick and put the complete markup in \`props.markup\`:

\`\`\`json
{ "brick": "html.svg", "props": { "markup": "<svg viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\"><path d=\\"M4 12l5 5L20 6\\"/></svg>" }, "style": { "width": "3rem", "fg": "color.primary" }, "texts": { "label": "Done" } }
\`\`\`

- \`currentColor\` follows \`style.fg\`; \`style.width\` sets the size, the height follows the viewBox ratio (width/height attributes become a viewBox).
- \`texts.label\` is the accessible name (\`role="img"\`); leave it empty for a decorative drawing (\`aria-hidden\`). It is not a component prop unless you set \`textProps.label\`.
- Allowed: shapes, paths, groups, text, gradients, patterns, masks, clip paths, filters, markers, \`<use href="#id">\`, SMIL animations, \`data:image/png|jpeg|gif|webp\` images. Rejected (error on \`props.markup\`): scripts, event handlers (\`on*\`), \`<foreignObject>\`, \`<style>\`, links, and any external URL. Internal ids are prefixed automatically so several SVGs never collide.
- The export contains real JSX (\`<path strokeWidth="2" />\`), not innerHTML.

## Bricks

${ALL_BRICKS.map(brickDoc).join("\n\n")}

## Examples

${ex.map((e) => `### ${e.label}\n\n\`\`\`json\n${JSON.stringify(e.spec, null, 2)}\n\`\`\``).join("\n\n")}

## Optional

- [JSON Schema of the spec](${origin}/schema.json)
- [Studio](${origin}/)
`;
}
