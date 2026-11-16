"use client";
/**
 * Rendu seul d'un composant, pour les captures de l'outil MCP render_preview (navigateur sans interface).
 *   /render#spec=<payload>&scheme=light|dark&overlays=closed|open
 * Le payload accepte les mêmes encodages que /new. Rien n'est enregistré.
 * Quand le rendu est stable (polices, icônes, animations finies), #forge-render reçoit
 * data-render-state="ready" ; en cas d'erreur, "error" et le message dans data-render-error.
 */
import * as React from "react";
import type { ComponentDoc } from "@/forge/model/types";
import { ComponentRenderer } from "@/forge/runtime/Renderer";
import { loadAgentJson, readSpecFromLocation } from "@/forge/spec/link";
import { preloadIconsFor } from "@/forge/runtime/icons";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; doc: ComponentDoc; scheme: "light" | "dark"; overlays: "closed" | "open" };

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** Attend la fin des animations finies (entrées, NumberFlow…), sans dépasser `max` ms */
async function settle(max = 2500) {
  await document.fonts.ready;
  await frame();
  await frame();
  const finite = document.getAnimations().filter((a) => {
    const end = a.effect?.getComputedTiming().endTime;
    return typeof end === "number" && Number.isFinite(end);
  });
  await Promise.race([Promise.allSettled(finite.map((a) => a.finished)), new Promise((r) => setTimeout(r, max))]);
  await frame();
}

export default function RenderPage() {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const r = await readSpecFromLocation(window.location);
      if (!r.text) return alive && setState({ status: "error", message: `spec: ${r.error ?? "missing"}` });
      const loaded = loadAgentJson(r.text);
      if (!loaded.doc) return alive && setState({ status: "error", message: loaded.diagnostics.map((d) => d.message).join("\n") });
      await preloadIconsFor(loaded.doc);
      if (!alive) return;
      const scheme = hash.get("scheme") === "dark" ? "dark" : hash.get("scheme") === "light" ? "light" : loaded.doc.theme.defaultScheme;
      setState({ status: "ready", doc: loaded.doc, scheme, overlays: hash.get("overlays") === "open" ? "open" : "closed" });
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (state.status !== "ready") return;
    let alive = true;
    void settle().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [state]);

  if (state.status === "loading") return <div id="forge-render" />;
  if (state.status === "error")
    return (
      <div id="forge-render" data-render-state="error" data-render-error={state.message} className="p-6 font-mono text-sm whitespace-pre-wrap text-red-600">
        {state.message}
      </div>
    );
  const bg = state.doc.theme.color[state.scheme].background;
  return (
    <div id="forge-render" data-render-state={ready ? "ready" : "rendering"} className="min-h-24 p-6" style={{ background: bg, colorScheme: state.scheme }}>
      {/* « open » : boîtes de dialogue, drawers et popovers rendus ouverts, en ligne (comme dans l'export statique) */}
      <ComponentRenderer doc={state.doc} mode={state.overlays === "open" ? "export" : "live"} scheme={state.scheme} breakpoints="media" />
    </div>
  );
}
