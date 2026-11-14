/** Validation du modèle JSON (onglet JSON, import). */
import { tr } from "../../i18n/core";
import { z } from "zod";
import { findBrick } from "../bricks/registry";
import type { ComponentDoc, Diagnostic } from "./types";
import { normalizeDoc } from "./ops";

const styleValue = z.union([z.object({ token: z.string() }).strict(), z.object({ value: z.string() }).strict()]);
const styleDecl = z.record(z.string(), styleValue);
const node = z.object({
  id: z.string().regex(/^[a-z][a-zA-Z]*\d+$/, "id attendu : lettres puis chiffres (ex. button1)"),
  brick: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  slots: z.record(z.string(), z.array(z.string())),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  texts: z.record(z.string(), z.object({ value: z.union([z.string(), z.array(z.string())]), expose: z.boolean(), propName: z.string().regex(/^[A-Za-z_$][\w$]*$/) })),
  style: z.object({
    base: styleDecl,
    hover: styleDecl.optional(),
    focus: styleDecl.optional(),
    active: styleDecl.optional(),
    disabled: styleDecl.optional(),
    sm: styleDecl.optional(),
    md: styleDecl.optional(),
    lg: styleDecl.optional(),
    xl: styleDecl.optional(),
  }),
  className: z.string().optional(),
  classNameExpr: z.string().optional(),
  extraAttrs: z.record(z.string(), z.string()).optional(),
  interactions: z.array(
    z.object({
      trigger: z.literal("click"),
      action: z.union([
        z.object({ type: z.enum(["open", "close", "toggle"]), target: z.string() }),
        z.object({ type: z.literal("setValue"), target: z.string(), value: z.number() }),
        z.object({ type: z.literal("navigate"), href: z.string(), newTab: z.boolean().optional() }),
        z.object({ type: z.literal("custom"), code: z.string() }),
      ]),
    }),
  ),
  animation: z
    .object({
      preset: z.enum(["none", "fade", "fade-up", "pop-in", "slide-up", "slide-down", "scale", "blur-in"]),
      on: z.enum(["mount", "hover", "in-view"]),
      durationMs: z.number(),
      delayMs: z.number(),
      easing: z.string(),
      reducedMotion: z.enum(["disable", "fade-only"]),
      origin: z.string().optional(),
    })
    .optional(),
});

export const docSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string().min(1),
  rootId: z.string(),
  nodes: z.record(z.string(), node),
  theme: z.object({
    color: z.object({ light: z.record(z.string(), z.string()), dark: z.record(z.string(), z.string()) }),
    radius: z.string(),
    space: z.record(z.string(), z.string()),
    shadow: z.record(z.string(), z.string()),
    font: z.object({ sans: z.string(), heading: z.string(), mono: z.string() }),
    fontSize: z.record(z.string(), z.string()),
    defaultScheme: z.enum(["light", "dark"]),
    exposed: z.array(z.object({ token: z.string(), propName: z.string() })),
    preset: z.object({ id: z.string(), name: z.string(), source: z.string(), license: z.string(), copyright: z.string() }).optional(),
  }),
  exposedProps: z.array(z.object({ nodeId: z.string(), prop: z.string(), propName: z.string() })),
  preservedImports: z.array(z.string()).optional(),
  preservedCode: z.object({ module: z.array(z.string()), body: z.array(z.string()) }).optional(),
  meta: z.object({ createdAt: z.string(), updatedAt: z.string(), template: z.string().optional() }),
});

function lineOfPath(json: string, path: (string | number)[]): number | undefined {
  // approximation : ligne de la dernière clé du chemin
  const key = [...path].reverse().find((p) => typeof p === "string");
  if (!key) return undefined;
  const idx = json.indexOf(`"${key}"`);
  return idx < 0 ? undefined : json.slice(0, idx).split("\n").length;
}

export function parseJsonDoc(text: string): { doc: ComponentDoc | null; diagnostics: Diagnostic[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const pos = Number(msg.match(/position (\d+)/)?.[1]);
    const line = Number.isFinite(pos) ? text.slice(0, pos).split("\n").length : undefined;
    return { doc: null, diagnostics: [{ severity: "error", message: tr("Invalid JSON: {msg}", { msg }), line, column: 1 }] };
  }
  const r = docSchema.safeParse(raw);
  if (!r.success) {
    return {
      doc: null,
      diagnostics: r.error.issues.slice(0, 20).map((i) => ({ severity: "error", message: `${i.path.join(".")} : ${i.message}`, line: lineOfPath(text, i.path as (string | number)[]), column: 1 })),
    };
  }
  const doc = r.data as ComponentDoc;
  const diagnostics: Diagnostic[] = [];
  if (!doc.nodes[doc.rootId]) return { doc: null, diagnostics: [{ severity: "error", message: tr("rootId “{id}” not found in nodes.", { id: doc.rootId }) }] };
  for (const n of Object.values(doc.nodes)) {
    if (n.brick !== "raw.jsx" && !findBrick(n.brick)) diagnostics.push({ severity: "error", message: tr("Unknown brick “{brick}” (node {id}).", { brick: n.brick, id: n.id }), line: lineOfPath(text, [n.id]) });
    for (const ids of Object.values(n.slots)) for (const c of ids) if (!doc.nodes[c]) diagnostics.push({ severity: "error", message: tr("Child “{child}” not found (node {id}).", { child: c, id: n.id }), line: lineOfPath(text, [n.id]) });
  }
  if (diagnostics.some((d) => d.severity === "error")) return { doc: null, diagnostics };
  normalizeDoc(doc);
  return { doc, diagnostics };
}
