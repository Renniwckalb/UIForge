import { jsonSchema } from "@/forge/spec/docs";

/** JSON Schema de la spec pour agents, généré depuis le registre des briques */
export async function GET(request: Request) {
  return Response.json(jsonSchema(new URL(request.url).origin), {
    headers: { "Content-Type": "application/schema+json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
