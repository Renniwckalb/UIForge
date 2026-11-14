"use client";
import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search } from "lucide-react";
import { ALL_BRICKS, FAMILIES, isContainer } from "@/forge/bricks/registry";
import type { BrickDefinition } from "@/forge/bricks/types";
import { canDrop, slotOf } from "@/forge/model/ops";
import { useStudio } from "@/forge/store/studio";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrickIcon } from "./brick-icon";
import { useT } from "@/i18n/react";

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Ajout au clic : dans le conteneur sélectionné, sinon à côté de l'élément sélectionné, sinon dans la racine */
export function addBrickSmart(brickId: string) {
  const { doc, selectedId, addBrick } = useStudio.getState();
  if (!doc) return;
  const candidates: { parentId: string; slot: string; index: number }[] = [];
  const sel = selectedId ? doc.nodes[selectedId] : null;
  if (sel) {
    for (const [slot, ids] of Object.entries(sel.slots)) candidates.push({ parentId: sel.id, slot, index: ids.length });
    const loc = slotOf(doc, sel.id);
    if (loc) candidates.push({ parentId: loc.parentId, slot: loc.slot, index: loc.index + 1 });
  }
  candidates.push({ parentId: doc.rootId, slot: "children", index: doc.nodes[doc.rootId].slots.children?.length ?? 0 });
  const c = candidates.find((c) => canDrop(doc, brickId, c.parentId, c.slot));
  if (c) addBrick(brickId, c.parentId, c.slot, c.index);
}

function BrickItem({ brick }: { brick: BrickDefinition }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lib:${brick.id}`, data: { kind: "new", brickId: brick.id } });
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <button
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          onClick={() => addBrickSmart(brick.id)}
          className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${isDragging ? "opacity-40" : ""}`}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground group-hover:text-foreground">
            <BrickIcon name={brick.icon} className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-tight">{t(brick.label)}</span>
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              {t(brick.library.name)}
              {isContainer(brick) ? ` · ${t("container")}` : ""}
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-64">
        <p>{t(brick.description)}</p>
        <p className="mt-1 opacity-70">{t("Click to add, or drag onto the canvas.")}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function BrickLibrary() {
  const t = useT();
  const [q, setQ] = React.useState("");
  const nq = normalize(q.trim());
  const match = (b: BrickDefinition) =>
    !nq || normalize([b.label, t(b.label), b.library.name, b.description, t(b.description), ...b.keywords].join(" ")).includes(nq);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search bricks…")} className="h-8 pl-8 text-[13px]" aria-label={t("Search bricks")} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {FAMILIES.map((f) => {
          const list = ALL_BRICKS.filter((b) => b.family === f.id && match(b));
          if (!list.length) return null;
          return (
            <section key={f.id} className="mb-2">
              <h3 className="sticky top-0 z-10 bg-sidebar px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase" title={t(f.hint)}>
                {t(f.label)}
                <span className="ml-1.5 font-normal normal-case tracking-normal opacity-70">{t(f.hint).split(/[:：]/)[1]?.trim() ?? t(f.hint)}</span>
              </h3>
              {list.map((b) => (
                <BrickItem key={b.id} brick={b} />
              ))}
            </section>
          );
        })}
        {FAMILIES.every((f) => !ALL_BRICKS.some((b) => b.family === f.id && match(b))) && (
          <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">{t("No matching brick.")}</p>
        )}
      </div>
    </div>
  );
}
