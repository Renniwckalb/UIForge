"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, PenTool, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getRepository } from "@/forge/persistence/indexeddb";
import type { ComponentSummary } from "@/forge/persistence/repository";
import { TEMPLATES } from "@/forge/model/templates";
import { newDocId, toPascal } from "@/forge/model/ops";
import { parseJsonDoc } from "@/forge/model/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LOCALE_TAGS } from "@/i18n/core";
import { useLocale } from "@/i18n/react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export default function Home() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const dateFmt = React.useMemo(() => new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: "medium", timeStyle: "short" }), [locale]);
  const [items, setItems] = React.useState<ComponentSummary[] | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<ComponentSummary | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const repo = getRepository();
  const refresh = React.useCallback(() => repo.list().then(setItems), [repo]);
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (templateId: string) => {
    const tpl = TEMPLATES.find((x) => x.id === templateId)!;
    const doc = tpl.build();
    doc.meta.template = tpl.id;
    await repo.save(doc);
    router.push(`/studio/${doc.id}`);
  };
  const duplicate = async (id: string) => {
    const doc = await repo.get(id);
    if (!doc) return;
    const now = new Date().toISOString();
    await repo.save({ ...doc, id: newDocId(), name: `${doc.name}Copy`, meta: { ...doc.meta, createdAt: now, updatedAt: now } });
    toast.success(t("Component duplicated"));
    refresh();
  };
  const rename = async (id: string, name: string) => {
    const doc = await repo.get(id);
    const v = toPascal(name);
    if (doc && v && v !== doc.name) await repo.save({ ...doc, name: v, meta: { ...doc.meta, updatedAt: new Date().toISOString() } });
    setRenaming(null);
    refresh();
  };
  const importJson = async (file: File) => {
    const r = parseJsonDoc(await file.text());
    if (!r.doc) return toast.error(t("Import failed"), { description: r.diagnostics[0]?.message });
    const doc = { ...r.doc, id: newDocId() };
    await repo.save(doc);
    router.push(`/studio/${doc.id}`);
  };

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span className="text-[15px] font-semibold tracking-tight">UI Forge</span>
          <span className="text-[13px] text-muted-foreground">{t("React component studio")}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/licences">{t("Licenses")}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dessin">
                <PenTool /> {t("SVG drawing")}
              </Link>
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> {t("Import a JSON model")}
            </Button>
            <LanguageSwitcher />
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus /> {t("New component")}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold tracking-tight">{t("My components")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("Saved locally in this browser (IndexedDB).")}</p>
        {items === null ? (
          <p className="text-sm text-muted-foreground">{t("Loading…")}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background px-6 py-16 text-center">
            <p className="text-sm font-medium">{t("No components yet")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("Start from a blank canvas or a template: pricing card, drawer, ⌘K palette, animated stat…")}</p>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus /> {t("New component")}
            </Button>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border bg-background">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  {renaming === it.id ? (
                    <input
                      autoFocus
                      defaultValue={it.name}
                      onBlur={(e) => rename(it.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="h-7 rounded-md border px-2 font-mono text-sm outline-none focus-visible:border-ring"
                      aria-label={t("New name")}
                    />
                  ) : (
                    <Link href={`/studio/${it.id}`} className="font-mono text-sm font-medium hover:underline">
                      {it.name}
                    </Link>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {t("{count} elements · modified {date}", { count: it.nodeCount, date: dateFmt.format(new Date(it.updatedAt)) })}
                    {it.template && it.template !== "blank" ? ` · ${t("template {name}", { name: t(TEMPLATES.find((x) => x.id === it.template)?.label ?? it.template) })}` : ""}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/studio/${it.id}`}>{t("Open")}</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t("Actions for {name}", { name: it.name })}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setRenaming(it.id)}>
                      <Pencil /> {t("Rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => duplicate(it.id)}>
                      <Copy /> {t("Duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(it)}>
                      <Trash2 /> {t("Delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-muted-foreground">
        {(() => {
          const [before, after = ""] = t("The idea of bringing everything together in one tool comes from {name}.").split("{name}");
          return (
            <>
              {before}
              <a href="https://github.com/Renniwckalb/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
                Renniwckalb
              </a>
              {after}
            </>
          );
        })()}
      </footer>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("New component")}</DialogTitle>
            <DialogDescription>{t("Start from a blank canvas or a template. Everything stays editable.")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((tpl) => (
              <button key={tpl.id} type="button" onClick={() => create(tpl.id)} className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left hover:border-foreground/30 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
                <span className="text-sm font-medium">{t(tpl.label)}</span>
                <span className="text-xs text-muted-foreground">{t(tpl.description)}</span>
                {tpl.libraries.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {tpl.libraries.map((l) => (
                      <span key={l} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        {l}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete {name}?", { name: toDelete?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("The component will be permanently deleted from this browser.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (toDelete) await repo.remove(toDelete.id);
                setToDelete(null);
                refresh();
              }}
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
