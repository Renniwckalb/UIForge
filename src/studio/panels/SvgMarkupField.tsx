"use client";
/**
 * Éditeur du code SVG de la brique html.svg : coller, importer un fichier .svg ou le dessin de la page
 * Dessin, recolorer en currentColor. Le balisage n'est enregistré que s'il est valide, toujours nettoyé.
 */
import * as React from "react";
import Link from "next/link";
import { FileUp, Palette, PenTool, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DRAWING_STORAGE_KEY, toSvg, type Drawing } from "@/draw/shapes";
import { isFatal, MAX_SVG_BYTES, prepareSvg, recolorSvg, serializeSvg, type SvgIssue } from "@/forge/svg/svg";
import { useT } from "@/i18n/react";

function useIssueText() {
  const t = useT();
  return (i: SvgIssue) => {
    switch (i.code) {
      case "parse":
        return t("Invalid SVG: {detail}", { detail: i.detail });
      case "root":
        return t("The code must contain a single <svg> element.");
      case "size":
        return t("SVG too large (max {detail}).", { detail: i.detail });
      case "element":
        return t("<{detail}> element removed (not allowed).", { detail: i.detail });
      case "attribute":
        return t("Attribute {detail} removed (not allowed).", { detail: i.detail });
      case "url":
        return t("External reference removed: {detail}", { detail: i.detail });
      case "viewBox":
        return t("No viewBox: the drawing may not scale with its width.");
    }
  };
}

export function SvgMarkupField({ id, value, onChange }: { id: string; value: string; onChange: (markup: string) => void }) {
  const t = useT();
  const issueText = useIssueText();
  const [draft, setDraft] = React.useState(value);
  const [issues, setIssues] = React.useState<SvgIssue[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Modifié ailleurs (annuler, onglet Code) : le brouillon suit (état dérivé, pendant le rendu)
  const [synced, setSynced] = React.useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }

  /** Valide puis enregistre la version nettoyée ; un balisage inutilisable reste dans le brouillon */
  const commit = (markup: string) => {
    const p = prepareSvg(markup);
    setIssues(p.issues);
    if (!p.tree) {
      setDraft(markup);
      return false;
    }
    setDraft(p.markup);
    if (p.markup !== value) onChange(p.markup);
    return true;
  };

  const importFile = async (file: File) => {
    if (file.size > MAX_SVG_BYTES) {
      setIssues([{ code: "size", detail: `${MAX_SVG_BYTES / 1000} KB` }]);
      return;
    }
    if (commit(await file.text())) toast.success(t("SVG imported"));
  };

  const importDrawing = () => {
    let drawing: Drawing | null = null;
    try {
      const raw = window.localStorage.getItem(DRAWING_STORAGE_KEY);
      drawing = raw ? (JSON.parse(raw) as Drawing) : null;
    } catch {
      drawing = null;
    }
    if (!drawing || !Array.isArray(drawing.shapes) || !drawing.shapes.length) {
      toast.error(t("No drawing yet: draw something on the Drawing page first."));
      return;
    }
    if (commit(toSvg(drawing, { crop: true }))) toast.success(t("Drawing imported"));
  };

  const recolor = () => {
    const p = prepareSvg(draft);
    if (p.tree) commit(serializeSvg(recolorSvg(p.tree)));
  };

  const fatal = issues.find(isFatal);
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        id={id}
        value={draft}
        spellCheck={false}
        aria-invalid={!!fatal}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && commit(draft)}
        onPaste={(e) => {
          // Collage dans un champ vide ou entièrement sélectionné : appliqué tout de suite
          const el = e.currentTarget;
          if (el.selectionStart === 0 && el.selectionEnd === el.value.length) {
            e.preventDefault();
            commit(e.clipboardData.getData("text"));
          }
        }}
        className="max-h-64 min-h-24 font-mono text-[11px] leading-relaxed md:text-[11px]"
      />
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="xs" onClick={() => fileRef.current?.click()}>
          <FileUp />
          {t("Import .svg")}
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={importDrawing} title={t("Use the drawing from the Drawing page")}>
          <PenTool />
          {t("From Drawing")}
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={recolor} title={t("Fills and strokes take the Text color (Style panel)")}>
          <Palette />
          {t("Use text color")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void importFile(f);
          }}
        />
      </div>
      <Link href="/dessin" target="_blank" className="w-fit text-[11px] text-muted-foreground underline-offset-2 hover:underline">
        {t("Open the Drawing page")}
      </Link>
      {issues.filter((i) => i.code !== "viewBox" || !fatal).length > 0 && (
        <ul className={`flex flex-col gap-1 text-[11px] ${fatal ? "text-destructive" : "text-muted-foreground"}`}>
          {issues.slice(0, 6).map((i, k) => (
            <li key={k} className="flex gap-1.5">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
              <span className="break-all">{issueText(i)}</span>
            </li>
          ))}
          {issues.length > 6 && <li>{t("…and {count} more", { count: issues.length - 6 })}</li>}
        </ul>
      )}
    </div>
  );
}
