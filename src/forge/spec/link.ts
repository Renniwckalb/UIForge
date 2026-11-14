/**
 * Liens de création : /new?spec=<payload>, /new#spec=<payload> ou /new?src=<url d'un JSON>.
 *
 * <payload> accepte trois encodages, pour qu'un agent puisse produire un lien avec ou sans outils :
 *   - JSON brut encodé pour l'URL (encodeURIComponent)
 *   - base64url du JSON
 *   - "z." + base64url du JSON compressé en deflate-raw (le plus court ; produit par POST /api/link)
 * Le JSON est une spec (format ui-forge/spec@1) ou un modèle complet (ComponentDoc).
 */
import type { ComponentDoc, Diagnostic } from "../model/types";
import { parseJsonDoc } from "../model/schema";
import { newDocId } from "../model/ops";
import { isComponentDoc, specToDoc } from "./spec";

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** JSON → "z.<base64url(deflate-raw)>" */
export async function encodePayload(json: string): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
  return `z.${bytesToB64url(packed)}`;
}

/** Payload (brut, base64url ou compressé) → texte JSON */
export async function decodePayload(payload: string): Promise<string> {
  const s = payload.trim();
  if (s.startsWith("{")) return s;
  if (s.startsWith("z.")) {
    const bytes = await pipe(b64urlToBytes(s.slice(2)), new DecompressionStream("deflate-raw"));
    return new TextDecoder().decode(bytes);
  }
  const text = new TextDecoder().decode(b64urlToBytes(s));
  if (!text.trimStart().startsWith("{")) throw new Error("not JSON");
  return text;
}

export type LoadResult = { doc: ComponentDoc | null; diagnostics: Diagnostic[]; kind: "spec" | "doc" | null };

/** Texte JSON (spec ou modèle complet) → modèle validé, avec un nouvel identifiant */
export function loadAgentJson(text: string): LoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { doc: null, kind: null, diagnostics: [{ severity: "error", message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` }] };
  }
  if (isComponentDoc(raw)) {
    const r = parseJsonDoc(text);
    if (r.doc) {
      const now = new Date().toISOString();
      r.doc.id = newDocId();
      r.doc.meta = { ...r.doc.meta, createdAt: now, updatedAt: now };
    }
    return { ...r, kind: "doc" };
  }
  return { ...specToDoc(raw), kind: "spec" };
}

/** Taille maximale acceptée pour une spec (texte JSON décodé) */
export const MAX_SPEC_BYTES = 1_000_000;

/** Lit la spec d'une URL de création (/new?spec=…, #spec=…, ?src=…) */
export async function readSpecFromLocation(loc: { search: string; hash: string }, fetcher: typeof fetch = fetch): Promise<{ text: string | null; error?: string; source?: string }> {
  const params = new URLSearchParams(loc.search);
  const hash = new URLSearchParams(loc.hash.replace(/^#/, ""));
  const payload = hash.get("spec") ?? params.get("spec");
  if (payload) {
    try {
      const text = await decodePayload(payload);
      return text.length > MAX_SPEC_BYTES ? { text: null, error: "too-large" } : { text, source: hash.get("spec") ? "hash" : "query" };
    } catch {
      return { text: null, error: "decode" };
    }
  }
  const src = params.get("src");
  if (src) {
    let url: URL;
    try {
      url = new URL(src);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      return { text: null, error: "src-url" };
    }
    try {
      const r = await fetcher(url, { credentials: "omit", redirect: "follow" });
      if (!r.ok) return { text: null, error: `src-http:${r.status}` };
      const text = await r.text();
      return text.length > MAX_SPEC_BYTES ? { text: null, error: "too-large" } : { text, source: url.origin };
    } catch {
      return { text: null, error: "src-fetch" };
    }
  }
  return { text: null, error: "missing" };
}
