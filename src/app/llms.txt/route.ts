import { llmsTxt } from "@/forge/spec/docs";

/** Mode d'emploi pour les agents IA (format spec, briques, liens de création) */
export async function GET(request: Request) {
  return new Response(llmsTxt(new URL(request.url).origin), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
