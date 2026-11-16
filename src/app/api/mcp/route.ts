/**
 * Serveur MCP (Model Context Protocol) en « Streamable HTTP » sans état : un message JSON-RPC par POST,
 * réponse JSON. Aucune session ni flux SSE (GET → 405, comme le prévoit la spécification).
 *
 *   claude mcp add --transport http ui-forge http://localhost:3000/api/mcp
 *
 * Outils et fonctionnement : src/forge/mcp/server.ts
 */
import { handleMcpPost, MCP_CORS } from "@/forge/mcp/server";

export async function POST(req: Request) {
  return handleMcpPost(req);
}

function notAllowed() {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Method not allowed: this stateless MCP server only accepts POST (no SSE stream, no session)" } },
    { status: 405, headers: { ...MCP_CORS, Allow: "POST, OPTIONS" } },
  );
}

export const GET = notAllowed;
export const DELETE = notAllowed;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: MCP_CORS });
}
