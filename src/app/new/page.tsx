"use client";
/**
 * Lien de création : /new?spec=…, /new#spec=… ou /new?src=https://…/spec.json
 * Le composant décrit (spec pour agents ou modèle complet) est validé puis montré avant création :
 * rien n'est enregistré sans confirmation (un lien peut venir de n'importe où).
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleX, Plus, TriangleAlert } from "lucide-react";
import { getRepository } from "@/forge/persistence/indexeddb";
import { findBrick } from "@/forge/bricks/registry";
import type { ComponentDoc, Diagnostic, NodeId } from "@/forge/model/types";
import { loadAgentJson, readSpecFromLocation } from "@/forge/spec/link";
import { Button } from "@/components/ui/button";
import { translateNodeName } from "@/i18n/core";
import { useLocale } from "@/i18n/react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { BrickIcon } from "@/studio/brick-icon";

type State =
  | { status: "loading" }
  | { status: "error"; reason: string; diagnostics?: Diagnostic[]; text?: string }
  | { status: "ready"; doc: ComponentDoc; source?: string; kind: "spec" | "doc" };

function Tree({ doc, id, depth = 0 }: { doc: ComponentDoc; id: NodeId; depth?: number }) {
  const { locale } = useLocale();
  const n = doc.nodes[id];
  if (!n) return null;
  const b = findBrick(n.brick);
  const kids = Object.values(n.slots).flat();
  return (
    <li>
      <div className="flex h-6 items-center gap-1.5 text-[13px]" style={{ paddingLeft: depth * 14 }}>
        <BrickIcon name={b?.icon ?? "Box"} className="size-3.5 shrink-0 opacity-60" />
        <span className="truncate">{translateNodeName(locale, n.name)}</span>
      </div>
      {kids.length > 0 && (
        <ul>
          {kids.map((c) => (
            <Tree key={c} doc={doc} id={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function NewFromLink() {
  const router = useRouter();
  const { t } = useLocale();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const r = await readSpecFromLocation(window.location);
      if (!alive) return;
      if (!r.text) return setState({ status: "error", reason: r.error ?? "missing" });
      const loaded = loadAgentJson(r.text);
      if (!alive) return;
      if (!loaded.doc) return setState({ status: "error", reason: "invalid", diagnostics: loaded.diagnostics, text: r.text });
      setState({ status: "ready", doc: loaded.doc, source: r.source, kind: loaded.kind ?? "spec" });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const reasons: Record<string, string> = {
    missing: t("This link does not contain a component. Expected /new?spec=…, /new#spec=… or /new?src=https://…"),
    decode: t("The spec in the link could not be decoded (expected JSON, base64url or z.<deflate>)."),
    "too-large": t("The spec is too large (max 1 MB)."),
    "src-url": t("The src parameter must be an http(s) URL."),
    "src-fetch": t("The JSON file could not be downloaded (network error or CORS not allowed by its host)."),
    invalid: t("The component is not valid:"),
  };
  const reason = (r: string) => reasons[r] ?? (r.startsWith("src-http:") ? t("The JSON file could not be downloaded (HTTP {status}).", { status: r.slice(9) }) : r);

  const create = async () => {
    if (state.status !== "ready") return;
    setCreating(true);
    const doc = state.doc;
    await getRepository().save(doc);
    router.replace(`/studio/${doc.id}`);
  };

  const doc = state.status === "ready" ? state.doc : null;
  const custom = doc ? Object.values(doc.nodes).some((n) => n.interactions.some((i) => i.action.type === "custom")) || !!doc.preservedCode?.module.length || !!doc.preservedCode?.body.length || Object.values(doc.nodes).some((n) => n.brick === "raw.jsx") : false;
  const bricks = doc ? [...new Set(Object.values(doc.nodes).map((n) => n.brick))].filter((b) => b !== "layout.stack" || Object.keys(doc.nodes).length === 1) : [];
  const libraries = doc ? [...new Set(bricks.map((b) => findBrick(b)?.library.name).filter(Boolean))] : [];

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            UI Forge
          </Link>
          <span className="text-[13px] text-muted-foreground">{t("New component from a link")}</span>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
        {state.status === "loading" && <p className="text-sm text-muted-foreground">{t("Loading…")}</p>}

        {state.status === "error" && (
          <section className="flex flex-col gap-3 rounded-lg border bg-background p-5" role="alert">
            <h1 className="flex items-center gap-2 text-base font-semibold">
              <CircleX className="size-4 text-destructive" /> {t("Cannot create this component")}
            </h1>
            <p className="text-sm">{reason(state.reason)}</p>
            {state.diagnostics && (
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-[12px]">
                {state.diagnostics.map((d, i) => (
                  <li key={i}>{d.message}</li>
                ))}
              </ul>
            )}
            <p className="text-[13px] text-muted-foreground">
              {t("Format reference for AI agents:")}{" "}
              <a className="underline" href="/llms.txt">
                /llms.txt
              </a>{" "}
              ·{" "}
              <a className="underline" href="/schema.json">
                /schema.json
              </a>
            </p>
            <Button variant="outline" className="self-start" asChild>
              <Link href="/">{t("Back to my components")}</Link>
            </Button>
          </section>
        )}

        {doc && state.status === "ready" && (
          <section className="flex flex-col gap-4 rounded-lg border bg-background p-5">
            <div>
              <h1 className="font-mono text-lg font-semibold">{doc.name}</h1>
              <p className="text-[13px] text-muted-foreground">
                {t("{count} elements", { count: Object.keys(doc.nodes).length })}
                {libraries.length ? ` · ${libraries.join(", ")}` : ""}
                {state.source && state.source !== "hash" && state.source !== "query" ? ` · ${t("from {source}", { source: state.source })}` : ""}
              </p>
            </div>
            <p className="text-sm">{t("This link creates the component below in this browser. Check it, then create it to open it in the studio.")}</p>
            {custom && (
              <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-[13px] text-amber-900">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {t("It contains custom code that will be copied into your exports. Only continue if you trust the source of this link.")}
              </p>
            )}
            <ul className="max-h-80 overflow-y-auto rounded-md border p-2" aria-label={t("Layers")}>
              <Tree doc={doc} id={doc.rootId} />
            </ul>
            <div className="flex gap-2">
              <Button onClick={create} disabled={creating} data-testid="create-from-link">
                <Plus /> {t("Create and open in the studio")}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">{t("Cancel")}</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
