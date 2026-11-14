"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Download, Monitor, Moon, MousePointer2, Play, Redo2, Smartphone, Sun, Tablet, Undo2 } from "lucide-react";
import { toPascal } from "@/forge/model/ops";
import { useStudio, type Viewport } from "@/forge/store/studio";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportDialog } from "./ExportDialog";
import { shortcutConflicts } from "./shortcuts";
import { TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function TopBar({ saveState }: { saveState: "saved" | "saving" | "error" }) {
  const t = useT();
  const name = useStudio((s) => s.doc?.name ?? "");
  const viewport = useStudio((s) => s.viewport);
  const scheme = useStudio((s) => s.scheme);
  const mode = useStudio((s) => s.mode);
  const canUndo = useStudio((s) => s.past.length > 0);
  const canRedo = useStudio((s) => s.future.length > 0);
  const { set, undo, redo, update } = useStudio.getState();
  const conflicts = useStudio((s) => (s.doc ? [...shortcutConflicts(s.doc).keys()].join(",") : ""));
  const [exportOpen, setExportOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  const [prevName, setPrevName] = React.useState(name);
  if (prevName !== name) {
    setPrevName(name);
    setDraft(name);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2">
      <Tip label={t("My components")}>
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/" aria-label={t("My components")}>
            <ChevronLeft />
          </Link>
        </Button>
      </Tip>
      <span className="text-[13px] font-semibold tracking-tight">UI Forge</span>
      <span className="text-muted-foreground">/</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = toPascal(draft);
          setDraft(v);
          if (v !== name) update((d) => void (d.name = v));
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label={t("Component name")}
        className="h-7 w-48 rounded-md border border-transparent bg-transparent px-1.5 font-mono text-[13px] outline-none hover:border-border focus-visible:border-ring"
      />
      <span className="text-[11px] text-muted-foreground" aria-live="polite">
        {saveState === "saving" ? t("Saving…") : saveState === "error" ? t("Save failed") : t("Saved")}
      </span>

      <div className="mx-auto flex items-center gap-2">
        <ToggleGroup type="single" size="sm" variant="outline" value={mode} onValueChange={(v) => v && set({ mode: v as "edit" | "live" })} aria-label={t("Mode")}>
          <ToggleGroupItem value="edit" className="h-7 gap-1.5 px-2.5 text-[12px]">
            <MousePointer2 className="size-3.5" /> {t("Edit")}
          </ToggleGroupItem>
          <ToggleGroupItem value="live" className="h-7 gap-1.5 px-2.5 text-[12px]">
            <Play className="size-3.5" /> {t("Interactive")}
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" size="sm" variant="outline" value={viewport} onValueChange={(v) => v && set({ viewport: v as Viewport })} aria-label={t("Viewport")}>
          {(
            [
              ["mobile", Smartphone, "Mobile · 390px"],
              ["tablet", Tablet, "Tablet · 820px"],
              ["desktop", Monitor, "Desktop · 1280px"],
            ] as const
          ).map(([v, I, label]) => (
            <Tip key={v} label={t(label)}>
              <ToggleGroupItem value={v} className="h-7 w-8" aria-label={t(label)}>
                <I className="size-3.5" />
              </ToggleGroupItem>
            </Tip>
          ))}
        </ToggleGroup>
        <Tip label={scheme === "light" ? t("Preview in dark mode") : t("Preview in light mode")}>
          <Button variant="outline" size="icon-sm" onClick={() => set({ scheme: scheme === "light" ? "dark" : "light" })} aria-label={t("Toggle light / dark")}>
            {scheme === "light" ? <Sun /> : <Moon />}
          </Button>
        </Tip>
      </div>

      {conflicts && (
        <Tip label={t("Several elements use the same keyboard shortcut")}>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            onClick={() => {
              useStudio.getState().select(conflicts.split(",")[0]);
              set({ rightTab: "behavior" });
            }}
          >
            <TriangleAlert /> {t("Shortcut conflict")}
          </Button>
        </Tip>
      )}
      <Tip label={t("Undo (Ctrl+Z)")}>
        <Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={undo} aria-label={t("Undo")}>
          <Undo2 />
        </Button>
      </Tip>
      <Tip label={t("Redo (Ctrl+Shift+Z)")}>
        <Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={redo} aria-label={t("Redo")}>
          <Redo2 />
        </Button>
      </Tip>
      <LanguageSwitcher compact />
      <Button size="sm" onClick={() => setExportOpen(true)}>
        <Download /> {t("Export")}
      </Button>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </header>
  );
}
