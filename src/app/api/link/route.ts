/**
 * Valide une spec et renvoie le lien de création correspondant (/new#spec=z.…, compressé).
 * Utile aux agents qui ne peuvent pas compresser eux-mêmes. Sans état : rien n'est enregistré.
 */
import { CORS, errorResponse, makeLink, readRequest } from "@/forge/export/api";

async function handle(req: Request) {
  try {
    const r = await readRequest(req);
    return Response.json(await makeLink(new URL(req.url).origin, r.input, r.locale), { headers: CORS });
  } catch (e) {
    return errorResponse(e);
  }
}

export const POST = handle;
export const GET = handle;
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
