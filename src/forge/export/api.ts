/**
 * Logique des routes /api/export et /api/link (sans état : rien n'est enregistré côté serveur).
 *
 * Entrée (corps JSON en POST, ou paramètres en GET) :
 *   spec | doc | component   la spec pour agents ou le modèle complet (objet JSON)
 *   payload                  ou la même chose encodée comme dans les liens (JSON, base64url, z.…)
 *   format   "react" (défaut) | "web-component"
 *   language "tsx" (défaut) | "jsx"         (React)
 *   locale   "en" (défaut) | "fr" | "zh"    (README, commentaires, textes par défaut)
 *   output   "json" (défaut) | "zip"
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { ComponentDoc, Diagnostic } from "../model/types";
import { decodePayload, encodePayload, loadAgentJson, MAX_SPEC_BYTES } from "../spec/link";
import { docToSpec } from "../spec/spec";
import { buildExport, buildZip } from "./bundle";
import { DEFAULT_LOCALE, getLocale, isLocale, setCurrentLocale, type Locale } from "../../i18n/core";

export type ExportRequest = {
  input: unknown;
  format: "react" | "web-component";
  language: "tsx" | "jsx";
  locale: Locale;
  output: "json" | "zip";
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public diagnostics: Diagnostic[] = [],
  ) {
    super(message);
  }
}

export const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message, diagnostics: e.diagnostics }, { status: e.status, headers: CORS });
  console.error("[api]", e);
  return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500, headers: CORS });
}

/** Lit la requête (POST JSON ou GET ?payload=… / ?spec=…) */
export async function readRequest(req: Request): Promise<ExportRequest> {
  let params: Record<string, unknown>;
  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_SPEC_BYTES * 2) throw new ApiError(413, "Request body too large (max 2 MB)");
    try {
      params = JSON.parse(text);
    } catch {
      throw new ApiError(400, "The request body must be JSON");
    }
    if (!params || typeof params !== "object" || Array.isArray(params)) throw new ApiError(400, "The request body must be a JSON object");
  } else {
    params = Object.fromEntries(new URL(req.url).searchParams);
  }
  let input: unknown = params.spec ?? params.doc ?? params.component;
  const payload = typeof input === "string" ? input : typeof params.payload === "string" ? params.payload : null;
  if (payload !== null) {
    try {
      const text = await decodePayload(payload);
      if (text.length > MAX_SPEC_BYTES) throw new ApiError(413, "Spec too large (max 1 MB)");
      input = JSON.parse(text);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(400, "Could not decode the spec (expected JSON, base64url or z.<deflate-raw base64url>)");
    }
  }
  if (input === undefined) throw new ApiError(400, "Missing spec: send { \"spec\": {…} } (see /llms.txt)");
  const format = params.format === undefined ? "react" : params.format;
  if (format !== "react" && format !== "web-component") throw new ApiError(400, 'format must be "react" or "web-component"');
  const language = params.language === undefined ? "tsx" : params.language;
  if (language !== "tsx" && language !== "jsx") throw new ApiError(400, 'language must be "tsx" or "jsx"');
  const locale = params.locale === undefined ? DEFAULT_LOCALE : params.locale;
  if (!isLocale(locale)) throw new ApiError(400, 'locale must be "en", "fr" or "zh"');
  const output = params.output === undefined ? "json" : params.output;
  if (output !== "json" && output !== "zip") throw new ApiError(400, 'output must be "json" or "zip"');
  return { input, format, language, locale, output };
}

/** Exécute fn dans la langue demandée. fn est synchrone : aucune autre requête ne peut s'intercaler. */
function withLocale<T>(locale: Locale, fn: () => T): T {
  const prev = getLocale();
  setCurrentLocale(locale);
  try {
    return fn();
  } finally {
    setCurrentLocale(prev);
  }
}

/** Spec ou modèle complet → modèle validé (erreurs 422 avec chemins JSON) */
export function toDoc(input: unknown, locale: Locale): ComponentDoc {
  const r = withLocale(locale, () => loadAgentJson(JSON.stringify(input)));
  if (!r.doc) throw new ApiError(422, "Invalid component", r.diagnostics);
  return r.doc;
}

type WebComponentRuntime = { exportWebComponent: (doc: ComponentDoc, locale: Locale) => Promise<{ folder: string; dir: string; tag: string; files: Record<string, string> }> };
let runtime: Promise<WebComponentRuntime> | null = null;

/** Rendu serveur de l'export Web Component, compilé à part (scripts/build-export-runtime.mts) */
function loadRuntime(): Promise<WebComponentRuntime> {
  const file = join(process.cwd(), ".forge", "web-component-export.mjs");
  if (!existsSync(file)) throw new ApiError(503, "Web Component export is not available: run `npm run build:export-runtime` on the server");
  runtime ??= import(/* turbopackIgnore: true */ /* webpackIgnore: true */ pathToFileURL(file).href) as Promise<WebComponentRuntime>;
  return runtime;
}

export type ExportResult = { name: string; folder: string; format: ExportRequest["format"]; files: Record<string, string>; install?: string; usage?: string[]; tag?: string; dir?: string };

export async function runExport(req: ExportRequest): Promise<ExportResult> {
  const doc = toDoc(req.input, req.locale);
  if (req.format === "web-component") {
    const r = await (await loadRuntime()).exportWebComponent(doc, req.locale);
    const kebab = r.dir.split("/").pop();
    return {
      name: doc.name,
      folder: r.folder,
      format: req.format,
      files: r.files,
      tag: r.tag,
      dir: r.dir,
      usage: [`<script src="${r.dir}/${kebab}.umd.js"></script>\n<${r.tag}></${r.tag}>`, `import ${doc.name} from "./${r.dir}";\n${doc.name}.mount("#app");`, `import ${doc.name} from "./${r.dir}/react";\n<${doc.name} />`],
    };
  }
  const b = withLocale(req.locale, () => buildExport(doc, { language: req.language }));
  return { name: b.gen.componentName, folder: b.folder, format: req.format, files: b.files, install: b.installCommand, usage: [`import ${b.gen.componentName} from "@/components/${b.folder}";`, b.gen.usage, b.gen.usageCustom] };
}

export async function zipResponse(r: ExportResult) {
  const blob = await buildZip({ folder: r.folder, files: r.files } as Parameters<typeof buildZip>[0]);
  return new Response(blob, {
    headers: { ...CORS, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${r.folder}.zip"` },
  });
}

/** Lien de création pour une spec valide (fragment compressé + variante lisible en query si elle est courte) */
export async function makeLink(origin: string, input: unknown, locale: Locale) {
  const doc = toDoc(input, locale);
  const json = JSON.stringify(input);
  const url = `${origin}/new#spec=${await encodePayload(json)}`;
  const query = `${origin}/new?spec=${encodeURIComponent(json)}`;
  return { url, ...(query.length <= 8000 ? { queryUrl: query } : {}), name: doc.name, elements: Object.keys(doc.nodes).length, spec: docToSpec(doc) };
}
