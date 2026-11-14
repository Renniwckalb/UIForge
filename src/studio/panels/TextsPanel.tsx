"use client";
import * as React from "react";
import { findBrick } from "@/forge/bricks/registry";
import type { ComponentDoc, NodeId } from "@/forge/model/types";
import { usedPropNames, walk } from "@/forge/model/ops";
import { generateTsx } from "@/forge/codegen/tsx";
import { useStudio } from "@/forge/store/studio";
import { Switch } from "@/components/ui/switch";
import { BufferedInput, EmptyState, Section } from "./controls";
import { translateNodeName } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/react";

const IDENT = /^[A-Za-z_$][\w$]*$/;

function PropNameInput({ value, onCommit, check }: { value: string; onCommit: (v: string) => void; check: (v: string) => string | null }) {
  const t = useT();
  const [draft, setDraft] = React.useState(value);
  const [err, setErr] = React.useState<string | null>(null);
  const [prev, setPrev] = React.useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  return (
    <div className="flex flex-col gap-0.5">
      <input
        value={draft}
        aria-label={t("Prop name")}
        aria-invalid={!!err}
        onChange={(e) => {
          setDraft(e.target.value);
          const problem = check(e.target.value);
          setErr(problem);
          if (!problem) onCommit(e.target.value);
        }}
        onBlur={() => {
          setDraft(value);
          setErr(null);
        }}
        className="h-6 w-full rounded border bg-background px-1.5 font-mono text-[12px] outline-none focus-visible:border-ring aria-invalid:border-destructive"
      />
      {err && <span className="text-[11px] text-destructive">{err}</span>}
    </div>
  );
}

export function TextsPanel() {
  const { locale, t: tt } = useLocale();
  const doc = useStudio((s) => s.doc)!;
  const update = useStudio((s) => s.update);
  const select = useStudio((s) => s.select);

  const rows: { nodeId: NodeId; nodeName: string; key: string; label: string; kind: "text" | "list"; multiline?: boolean }[] = [];
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    for (const t of b?.texts ?? []) if (n.texts[t.key]) rows.push({ nodeId: n.id, nodeName: translateNodeName(locale, n.name), key: t.key, label: tt(t.label), kind: t.kind, multiline: t.multiline });
  });

  const checkName = (except: { nodeId: string; key: string } | null, current: string) => (v: string) => {
    if (!IDENT.test(v)) return tt("Invalid JS identifier");
    if (v === current) return null;
    const used = usedPropNames(doc as ComponentDoc, except ?? undefined);
    if (used.has(v)) return tt("Name already used");
    return null;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- commentaires du code généré dans la langue choisie
  const gen = React.useMemo(() => generateTsx(doc), [doc, locale]);
  const exposedCount = rows.filter((r) => doc.nodes[r.nodeId].texts[r.key].expose).length;

  return (
    <div>
      <div className="border-b px-3 py-2.5 text-[12px] text-muted-foreground">
        {tt("All visible texts of the component. When checked, they become props with the current value as default.")}
        <div className="mt-2 rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-[11px] text-foreground">{gen.usageCustom}</div>
      </div>
      <Section title={tt("Texts · {n}/{total} as props", { n: exposedCount, total: rows.length })}>
        {!rows.length && <EmptyState>{tt("No text yet.")}</EmptyState>}
        {rows.map((r) => {
          const b = doc.nodes[r.nodeId].texts[r.key];
          const val = Array.isArray(b.value) ? b.value.join("\n") : b.value;
          return (
            <div key={`${r.nodeId}.${r.key}`} className="flex flex-col gap-1.5 rounded-md border p-2">
              <div className="flex items-center gap-2">
                <button type="button" className="min-w-0 flex-1 truncate text-left text-[12px] hover:underline" onClick={() => select(r.nodeId)} title={tt("Select the element")}>
                  <span className="font-medium">{r.nodeName}</span>
                  <span className="text-muted-foreground"> · {r.label}</span>
                </button>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {tt("Prop")}
                  <Switch
                    size="sm"
                    checked={b.expose}
                    onCheckedChange={(v) => update((d) => void (d.nodes[r.nodeId].texts[r.key].expose = v))}
                    aria-label={tt("Expose {label} of {name} as a prop", { label: r.label, name: r.nodeName })}
                  />
                </label>
              </div>
              {r.kind === "list" || r.multiline ? (
                <textarea
                  value={val}
                  rows={r.kind === "list" ? Math.min(6, (val.match(/\n/g)?.length ?? 0) + 1) : 2}
                  onChange={(e) =>
                    update(
                      (d) => {
                        d.nodes[r.nodeId].texts[r.key].value = r.kind === "list" ? e.target.value.split("\n") : e.target.value;
                      },
                      { coalesce: `text:${r.nodeId}:${r.key}` },
                    )
                  }
                  aria-label={`${r.label} — ${r.nodeName}`}
                  className="w-full resize-y rounded-md border bg-background px-2 py-1 text-[12px] outline-none focus-visible:border-ring"
                />
              ) : (
                <BufferedInput
                  value={val}
                  onCommit={(v) => update((d) => void (d.nodes[r.nodeId].texts[r.key].value = v), { coalesce: `text:${r.nodeId}:${r.key}` })}
                  aria-label={`${r.label} — ${r.nodeName}`}
                />
              )}
              {r.kind === "list" && <span className="text-[11px] text-muted-foreground">{tt("One item per line · type string[]")}</span>}
              {b.expose && (
                <PropNameInput
                  value={b.propName}
                  check={checkName({ nodeId: r.nodeId, key: r.key }, b.propName)}
                  onCommit={(v) => update((d) => void (d.nodes[r.nodeId].texts[r.key].propName = v), { coalesce: `pn:${r.nodeId}:${r.key}` })}
                />
              )}
            </div>
          );
        })}
      </Section>
      <Section title={tt("Other exposed props")}>
        {doc.exposedProps.length === 0 && doc.theme.exposed.length === 0 && <p className="text-[12px] text-muted-foreground">{tt("None. Variants are exposed from the Behavior panel, colors from Theme.")}</p>}
        {doc.exposedProps.map((e, i) => (
          <div key={`${e.nodeId}.${e.prop}`} className="grid grid-cols-[1fr_140px] items-center gap-2 text-[12px]">
            <span className="truncate">
              {translateNodeName(locale, doc.nodes[e.nodeId]?.name ?? "")} · <span className="text-muted-foreground">{e.prop}</span>
            </span>
            <PropNameInput value={e.propName} check={checkName(null, e.propName)} onCommit={(v) => update((d) => void (d.exposedProps[i].propName = v))} />
          </div>
        ))}
        {doc.theme.exposed.map((e, i) => (
          <div key={`t.${e.token}.${i}`} className="grid grid-cols-[1fr_140px] items-center gap-2 text-[12px]">
            <span className="truncate">
              {tt("Color")} · <span className="text-muted-foreground">--{e.token}</span>
            </span>
            <PropNameInput value={e.propName} check={checkName(null, e.propName)} onCommit={(v) => update((d) => void (d.theme.exposed[i].propName = v))} />
          </div>
        ))}
      </Section>
    </div>
  );
}
