"use client";
import * as React from "react";
import { Check, Copy, Download, FileCode2, FileText, Folder, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildExport, buildZip } from "@/forge/export/bundle";
import { useVanillaExport, zipFiles } from "@/forge/export/snapshot";
import { useStudio } from "@/forge/store/studio";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "./panels/controls";
import { useLocale, useT } from "@/i18n/react";

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useT();
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        toast.success(t("{label} copied", { label }));
        window.setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check /> : <Copy />} {label}
    </Button>
  );
}

function CodeLine({ text, label }: { text: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-[12px] whitespace-nowrap">{text}</code>
      <CopyButton text={text} label={label} />
    </div>
  );
}

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { locale, t } = useLocale();
  const doc = useStudio((s) => s.doc);
  const [lang, setLang] = React.useState<"tsx" | "jsx">("tsx");
  const [format, setFormat] = React.useState<"react" | "html">("react");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- README et commentaires dans la langue choisie
  const bundle = React.useMemo(() => (doc && open ? buildExport(doc, { language: lang }) : null), [doc, lang, open, locale]);
  const vanilla = useVanillaExport(doc, open && format === "html", locale);
  const [picked, setFile] = React.useState<string | null>(null);
  if (!bundle) return null;
  if (format === "html") return <VanillaView open={open} onOpenChange={onOpenChange} name={bundle.gen.componentName} state={vanilla} onFormat={setFormat} picked={picked} setFile={setFile} />;
  const entry = `index.${lang}`;
  const file = picked && picked in bundle.files ? picked : entry;
  const importLine = `import ${bundle.gen.componentName} from "@/components/${bundle.folder}";`;

  const download = async () => {
    const blob = await buildZip(bundle);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bundle.folder}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("{file} downloaded", { file: `${bundle.folder}.zip` }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("Export {name}", { name: bundle.gen.componentName })}</DialogTitle>
          <DialogDescription>{t("A self-contained folder to drop into your project: no studio import, only React and the libraries used.")}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-3">
            <FormatSwitch value={format} onChange={setFormat} />
            <Segmented ariaLabel={t("Language")} value={lang} onChange={(v) => setLang(v as "tsx" | "jsx")} options={[{ value: "tsx", label: "TypeScript" }, { value: "jsx", label: "JavaScript" }]} />
            <div className="rounded-md border p-1 text-[12px]">
              <div className="flex items-center gap-1.5 px-2 py-1 font-medium">
                <Folder className="size-3.5" /> {bundle.folder}/
              </div>
              {Object.keys(bundle.files).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFile(f)}
                  className={`flex w-full items-center gap-1.5 rounded px-2 py-1 pl-5 text-left font-mono ${file === f ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
                >
                  {f.endsWith(".md") ? <FileText className="size-3.5 shrink-0" /> : <FileCode2 className="size-3.5 shrink-0" />}
                  <span className="truncate">{f}</span>
                </button>
              ))}
            </div>
            <Button onClick={download}>
              <Download /> {t("Download the .zip")}
            </Button>
            <CopyButton text={bundle.files[entry]} label={t("Copy the code")} />
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium">{t("1. Install")}</span>
              <CodeLine text={bundle.installCommand} label={t("Copy")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium">{t("2. Use in one line")}</span>
              <CodeLine text={importLine} label={t("Copy")} />
              <CodeLine text={bundle.gen.usage} label={t("Copy")} />
              <CodeLine text={bundle.gen.usageCustom} label={t("Copy")} />
            </div>
            <pre className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-[11.5px] leading-relaxed">{bundle.files[file] ?? ""}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormatSwitch({ value, onChange }: { value: "react" | "html"; onChange: (v: "react" | "html") => void }) {
  const t = useT();
  return <Segmented ariaLabel={t("Format")} value={value} onChange={(v) => onChange(v as "react" | "html")} options={[{ value: "react", label: "React" }, { value: "html", label: "Web Component" }]} />;
}

function VanillaView({
  open,
  onOpenChange,
  name,
  state,
  onFormat,
  picked,
  setFile,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  state: ReturnType<typeof useVanillaExport>;
  onFormat: (v: "react" | "html") => void;
  picked: string | null;
  setFile: (f: string) => void;
}) {
  const t = useT();
  const r = state.result;
  const file = r && picked && picked in r.files ? picked : "index.html";
  const download = async () => {
    if (!r) return;
    const blob = await zipFiles(r.folder, r.files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.folder}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("{file} downloaded", { file: `${r.folder}.zip` }));
  };
  const preview = () => {
    if (!r) return;
    // Aperçu dans un nouvel onglet : le script du composant est inséré dans la page
    const umd = `${r.dir}/${r.dir.split("/").pop()}.umd.js`;
    const html = r.files["index.html"].replace(`<script src="${umd}"></script>`, () => `<script>${r.files[umd].replace(/<\/script/gi, "<\\/script")}</script>`);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("Export {name} as a Web Component (JavaScript)", { name })}</DialogTitle>
          <DialogDescription>{t("A self-contained component (Web Component) in its own folder: importable in an HTML page, with a bundler, with CommonJS or in React, with no dependency or build.")}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-3">
            <FormatSwitch value="html" onChange={onFormat} />
            {r ? (
              <>
                <div className="rounded-md border p-1 text-[12px]">
                  <div className="flex items-center gap-1.5 px-2 py-1 font-medium">
                    <Folder className="size-3.5" /> {r.folder}/
                  </div>
                  {Object.keys(r.files).map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setFile(f)}
                      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 pl-5 text-left font-mono ${file === f ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
                    >
                      {f.endsWith(".md") ? <FileText className="size-3.5 shrink-0" /> : <FileCode2 className="size-3.5 shrink-0" />}
                      <span className="truncate">{f}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{Math.max(1, Math.round(r.files[f].length / 1024))} Ko</span>
                    </button>
                  ))}
                </div>
                <Button onClick={download}>
                  <Download /> {t("Download the .zip")}
                </Button>
                <Button variant="outline" onClick={preview}>
                  {t("Preview in a tab")}
                </Button>
                <CopyButton text={r.files[file]} label={t("Copy {file}", { file })} />
              </>
            ) : state.error ? (
              <p className="text-[12px] text-destructive">{t("Export failed: {error}", { error: state.error })}</p>
            ) : (
              <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {t("Rendering and compiling the CSS…")}
              </p>
            )}
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            {r && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium">{t("Copy {dir}/ into your project, then either:", { dir: r.dir })}</span>
                <CodeLine text={`<script src="${r.dir}/${r.dir.split("/").pop()}.umd.js"></script> <${r.tag}></${r.tag}>`} label="HTML" />
                <CodeLine text={`import ${name} from "./${r.dir}"; ${name}.mount("#app");`} label="JS" />
                <CodeLine text={`import ${name} from "./${r.dir}/react"; // <${name} />`} label="React" />
              </div>
            )}
            <pre className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-all">{r?.files[file] ?? ""}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
