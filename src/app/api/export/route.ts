/**
 * API d'export : un modèle ou une spec → le dossier exporté (React ou Web Component), en JSON ou en .zip.
 * Sans état et sans authentification : rien n'est enregistré. Documentation : /llms.txt
 */
import { CORS, errorResponse, readRequest, runExport, zipResponse } from "@/forge/export/api";

async function handle(req: Request) {
  try {
    const r = await readRequest(req);
    const result = await runExport(r);
    return r.output === "zip" ? await zipResponse(result) : Response.json(result, { headers: CORS });
  } catch (e) {
    return errorResponse(e);
  }
}

export const POST = handle;
export const GET = handle;
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
