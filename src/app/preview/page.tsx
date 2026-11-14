"use client";
import * as React from "react";
import type { ComponentDoc } from "@/forge/model/types";
import { ComponentRenderer } from "@/forge/runtime/Renderer";

/** Page chargée dans l'iframe du mode Interactif. Reçoit le modèle par postMessage. */
export default function PreviewPage() {
  const [state, setState] = React.useState<{ doc: ComponentDoc; scheme: "light" | "dark"; replayKey: number } | null>(null);

  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "forge:render") setState({ doc: e.data.doc, scheme: e.data.scheme, replayKey: e.data.replayKey ?? 0 });
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "forge:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!state) return null;
  const bg = state.doc.theme.color[state.scheme].background;
  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <ComponentRenderer
        doc={state.doc}
        mode="live"
        scheme={state.scheme}
        replayKey={state.replayKey}
        breakpoints="media"
        onNavigate={(href, newTab) => window.parent.postMessage({ type: "forge:navigate", href, newTab }, window.location.origin)}
      />
    </div>
  );
}
