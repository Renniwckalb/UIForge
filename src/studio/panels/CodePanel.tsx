"use client";
/**
 * Édition texte synchronisée dans les deux sens :
 *  - toute modification visuelle régénère le code (sans écraser ce que l'utilisateur est en train de taper)
 *  - toute frappe est reparsée (après une courte pause) vers le modèle, qui met à jour canvas et panneaux
 * Les parties non comprises sont signalées (marqueurs + liste) sans bloquer l'édition.
 */
import * as React from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { CircleAlert, CircleX, Info } from "lucide-react";
import type { ComponentDoc, Diagnostic } from "@/forge/model/types";
import { generateTsx } from "@/forge/codegen/tsx";
import { generateCss } from "@/forge/codegen/css";
import { parseTsx } from "@/forge/parser/tsx";
import { parseCss } from "@/forge/parser/css";
import { parseJsonDoc } from "@/forge/model/schema";
import { useStudio, type ChangeSource } from "@/forge/store/studio";

import { translateNodeName } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/react";

type Kind = "code" | "css" | "json";
type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

const SPECS: Record<Kind, { label: string; path: string; language: string; generate: (d: ComponentDoc) => string; parse: (t: string, prev: ComponentDoc) => { doc: ComponentDoc | null; diagnostics: Diagnostic[] } }> = {
  code: { label: "index.tsx", path: "file:///index.tsx", language: "typescript", generate: (d) => generateTsx(d).code, parse: parseTsx },
  css: { label: "styles.css", path: "file:///styles.css", language: "css", generate: (d) => generateCss(d), parse: parseCss },
  json: {
    label: "JSON model",
    path: "file:///model.json",
    language: "json",
    generate: (d) => JSON.stringify(d, null, 2),
    parse: (t) => parseJsonDoc(t),
  },
};

const beforeMount: BeforeMount = (monaco) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts = (monaco as any).typescript ?? (monaco.languages as any).typescript; // Monaco ≥ 0.55 : monaco.typescript
  ts?.typescriptDefaults?.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
  ts?.typescriptDefaults?.setCompilerOptions({ jsx: 1 /* Preserve */, target: 99, allowNonTsExtensions: true, module: 99 });
};

/** Monaco local (sans CDN) : chargé côté client uniquement, avant le premier éditeur */
let monacoReady: Promise<unknown> | null = null;
function useMonacoReady() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    monacoReady ??= import("../monaco-setup");
    monacoReady.then(() => setReady(true));
  }, []);
  return ready;
}

function SyncedEditor({ kind }: { kind: Kind }) {
  const { locale, t } = useLocale();
  const spec = SPECS[kind];
  const doc = useStudio((s) => s.doc)!;
  const lastSource = useStudio((s) => s.lastSource);
  const diagnostics = useStudio((s) => s.diagnostics[kind]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- les commentaires du code généré suivent la langue
  const generated = React.useMemo(() => spec.generate(doc), [doc, spec, locale]);
  const monacoLoaded = useMonacoReady();
  const editorRef = React.useRef<MonacoEditor | null>(null);
  const monacoRef = React.useRef<Monaco | null>(null);
  const programmatic = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);

  const setValue = React.useCallback((text: string) => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model || model.getValue() === text) return;
    programmatic.current = true;
    const sel = ed.getSelections();
    ed.executeEdits("forge-sync", [{ range: model.getFullModelRange(), text }], sel ?? undefined);
    ed.pushUndoStop();
    programmatic.current = false;
  }, []);

  // Visuel → code : on ne réécrit pas pendant que l'utilisateur tape dans cet éditeur
  React.useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const typingHere = lastSource === (kind as ChangeSource) && ed.hasTextFocus();
    if (!typingHere) setValue(generated);
  }, [generated, lastSource, kind, setValue]);

  // Marqueurs
  React.useEffect(() => {
    const m = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!m || !model) return;
    m.editor.setModelMarkers(
      model,
      "forge",
      diagnostics
        .filter((d) => d.line)
        .map((d) => ({
          severity: d.severity === "error" ? m.MarkerSeverity.Error : d.severity === "warning" ? m.MarkerSeverity.Warning : m.MarkerSeverity.Info,
          message: d.message,
          startLineNumber: d.line!,
          startColumn: d.column ?? 1,
          endLineNumber: d.endLine ?? d.line!,
          endColumn: d.endColumn ?? model.getLineMaxColumn(Math.min(d.endLine ?? d.line!, model.getLineCount())),
        })),
    );
  }, [diagnostics]);

  const onChange = (value: string | undefined) => {
    if (programmatic.current || value === undefined) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const st = useStudio.getState();
      if (!st.doc) return;
      const r = spec.parse(value, st.doc);
      st.setDiagnostics(kind, r.diagnostics);
      if (r.doc) st.replaceDoc(r.doc, kind);
    }, 350);
  };

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    setValue(generated);
    ed.onDidBlurEditorText(() => {
      // À la sortie de l'éditeur, on revient au code canonique si le parsing a réussi
      window.setTimeout(() => {
        const st = useStudio.getState();
        if (st.doc && !st.diagnostics[kind].some((d) => d.severity === "error")) setValue(spec.generate(st.doc));
      }, 400);
    });
  };

  const counts = { error: 0, warning: 0, info: 0 };
  diagnostics.forEach((d) => counts[d.severity]++);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        {monacoLoaded && <Editor
          path={spec.path}
          defaultLanguage={spec.language}
          defaultValue={generated}
          beforeMount={beforeMount}
          onMount={onMount}
          onChange={onChange}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: kind === "css" ? "off" : "on",
            renderLineHighlight: "none",
            automaticLayout: true,
            padding: { top: 8 },
          }}
          loading={<div className="p-4 text-[12px] text-muted-foreground">{t("Loading the editor…")}</div>}
        />}
      </div>
      <div className="max-h-40 shrink-0 overflow-y-auto border-t text-[12px]">
        <div className="flex items-center gap-3 px-3 py-1.5 text-muted-foreground">
          <span className="font-medium text-foreground">{t("Analysis")}</span>
          {diagnostics.length === 0 ? (
            <span>{t("In sync — all the code is understood.")}</span>
          ) : (
            <>
              {counts.error > 0 && <span className="text-destructive">{t("{n} error(s): the visual keeps the last valid version", { n: counts.error })}</span>}
              {counts.warning > 0 && <span>{t("{n} warning(s)", { n: counts.warning })}</span>}
              {counts.info > 0 && <span>{t("{n} info(s)", { n: counts.info })}</span>}
            </>
          )}
        </div>
        {diagnostics.map((d, i) => (
          <button
            type="button"
            key={i}
            onClick={() => {
              if (!d.line) return;
              editorRef.current?.revealLineInCenter(d.line);
              editorRef.current?.setPosition({ lineNumber: d.line, column: d.column ?? 1 });
              editorRef.current?.focus();
            }}
            className="flex w-full items-start gap-2 px-3 py-1 text-left hover:bg-muted"
          >
            {d.severity === "error" ? <CircleX className="mt-0.5 size-3.5 shrink-0 text-destructive" /> : d.severity === "warning" ? <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1">{d.message}</span>
            {d.line && <span className="shrink-0 font-mono text-muted-foreground">L{d.line}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tout ce qui a été saisi dans le code sans équivalent visuel : rien ne disparaît silencieusement */
function PreservedList() {
  const { locale, t } = useLocale();
  const doc = useStudio((s) => s.doc)!;
  const select = useStudio((s) => s.select);
  const nodes = Object.values(doc.nodes);
  const raw = nodes.filter((n) => n.brick === "raw.jsx");
  const withRaw = nodes.filter((n) => n.className || n.classNameExpr || (n.extraAttrs && Object.keys(n.extraAttrs).length));
  const custom = nodes.flatMap((n) => n.interactions.filter((i) => i.action.type === "custom").map(() => n));
  const items = [
    ...(doc.preservedImports ?? []).map((x) => ({ label: "Import", text: x })),
    ...(doc.preservedCode?.module ?? []).map((x) => ({ label: "Module", text: x })),
    ...(doc.preservedCode?.body ?? []).map((x) => ({ label: "Body", text: x })),
  ];
  const count = items.length + raw.length + withRaw.length + custom.length;
  if (!count) return null;
  return (
    <details className="shrink-0 border-t text-[12px]">
      <summary className="cursor-pointer px-3 py-1.5 font-medium">{t("Code kept outside panels ({n})", { n: count })}</summary>
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto px-3 pb-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">{t(it.label)}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]" title={it.text}>
              {it.text.split("\n")[0]}
            </code>
          </div>
        ))}
        {raw.map((n) => (
          <button key={n.id} type="button" onClick={() => select(n.id)} className="flex gap-2 text-left hover:underline">
            <span className="w-14 shrink-0 text-muted-foreground">{t("Raw JSX")}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{String(n.props.code).split("\n")[0]}</code>
          </button>
        ))}
        {withRaw.map((n) => (
          <button key={n.id} type="button" onClick={() => select(n.id)} className="flex gap-2 text-left hover:underline">
            <span className="w-14 shrink-0 text-muted-foreground">{translateNodeName(locale, n.name)}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
              {[n.className, n.classNameExpr, ...Object.keys(n.extraAttrs ?? {})].filter(Boolean).join(" · ")}
            </code>
          </button>
        ))}
        {custom.map((n, i) => (
          <button key={`c${i}`} type="button" onClick={() => select(n.id)} className="flex gap-2 text-left hover:underline">
            <span className="w-14 shrink-0 text-muted-foreground">{t("Click")}</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{t("{name}: custom action", { name: translateNodeName(locale, n.name) })}</code>
          </button>
        ))}
      </div>
    </details>
  );
}

export function CodePanel() {
  const t = useT();
  const [kind, setKind] = React.useState<Kind>("code");
  const diags = useStudio((s) => s.diagnostics);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5" role="tablist" aria-label={t("File")}>
        {(Object.keys(SPECS) as Kind[]).map((k) => {
          const n = diags[k].filter((d) => d.severity !== "info").length;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[12px] ${kind === k ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t(SPECS[k].label)}
              {n > 0 && <span className={`rounded px-1 text-[10px] ${diags[k].some((d) => d.severity === "error") ? "bg-destructive text-white" : "bg-amber-100 text-amber-900"}`}>{n}</span>}
            </button>
          );
        })}
      </div>
      <SyncedEditor key={kind} kind={kind} />
      <PreservedList />
    </div>
  );
}
