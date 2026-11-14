"use client";
import * as React from "react";
import Link from "next/link";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragStartEvent } from "@dnd-kit/core";
import { findBrick } from "@/forge/bricks/registry";
import { getRepository } from "@/forge/persistence/indexeddb";
import { useStudio, type RightTab } from "@/forge/store/studio";
import { Button } from "@/components/ui/button";
import { BrickLibrary } from "./BrickLibrary";
import { LayerTree } from "./LayerTree";
import { Canvas } from "./Canvas";
import { TopBar } from "./TopBar";
import { BehaviorPanel } from "./panels/BehaviorPanel";
import { StylePanel } from "./panels/StylePanel";
import { ThemePanel } from "./panels/ThemePanel";
import { TextsPanel } from "./panels/TextsPanel";
import { CodePanel } from "./panels/CodePanel";
import { computeDropTarget, useDnd, type DragData } from "./dnd";
import { BrickIcon } from "./brick-icon";
import { getLocale, translate, translateNodeName } from "@/i18n/core";
import { useT } from "@/i18n/react";

const TABS: { id: RightTab; label: string }[] = [
  { id: "behavior", label: "Behavior" },
  { id: "style", label: "Style" },
  { id: "theme", label: "Theme" },
  { id: "texts", label: "Texts" },
  { id: "code", label: "Code" },
];

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el?.closest?.("input, textarea, select, [contenteditable=true], .monaco-editor");
}

function useShortcuts() {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStudio.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (isTypingTarget(e.target)) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
      } else if (s.mode === "edit" && s.selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        s.remove(s.selectedId);
      } else if (s.mode === "edit" && s.selectedId && mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s.duplicate(s.selectedId);
      } else if (e.key === "Escape") {
        const parent = s.selectedId ? s.doc?.nodes[s.selectedId]?.parentId : null;
        s.select(parent ?? null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function useAutosave() {
  const doc = useStudio((s) => s.doc);
  const [state, setState] = React.useState<"saved" | "saving" | "error">("saved");
  const first = React.useRef(true);
  React.useEffect(() => {
    if (!doc) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = window.setTimeout(() => {
      getRepository()
        .save(doc)
        .then(() => setState("saved"))
        .catch(() => setState("error"));
    }, 400);
    return () => window.clearTimeout(t);
  }, [doc]);
  return state;
}

function DropIndicator() {
  const target = useDnd((s) => s.target);
  if (!target) return null;
  return (
    <>
      {target.box && <div className="pointer-events-none fixed z-[60] rounded-[3px] bg-[#2563eb]/5 outline-1 outline-[#2563eb]/50" style={{ left: target.box.x, top: target.box.y, width: target.box.w, height: target.box.h }} />}
      <div className="pointer-events-none fixed z-[61] rounded-full bg-[#2563eb]" style={{ left: target.line.x, top: target.line.y, width: Math.max(target.line.w, 2), height: Math.max(target.line.h, 2) }} />
    </>
  );
}

function RightPanel() {
  const tab = useStudio((s) => s.rightTab);
  const set = useStudio((s) => s.set);
  const tr = useT();
  return (
    <aside className={`flex min-h-0 shrink-0 flex-col border-l bg-background transition-[width] ${tab === "code" ? "w-[560px]" : "w-[340px]"}`}>
      <div role="tablist" aria-label={tr("Panels")} className="flex shrink-0 items-center gap-0.5 border-b px-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => set({ rightTab: t.id })}
            className={`relative h-10 px-2.5 text-[12.5px] ${tab === t.id ? "font-medium text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tr(t.label)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className={`min-h-0 flex-1 ${tab === "code" ? "flex flex-col" : "overflow-y-auto"}`}>
        {tab === "behavior" && <BehaviorPanel />}
        {tab === "style" && <StylePanel />}
        {tab === "theme" && <ThemePanel />}
        {tab === "texts" && <TextsPanel />}
        {tab === "code" && <CodePanel />}
      </div>
    </aside>
  );
}

export function Studio({ id }: { id: string }) {
  const t = useT();
  const doc = useStudio((s) => s.doc);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing">("loading");
  const saveState = useAutosave();
  useShortcuts();

  React.useEffect(() => {
    let alive = true;
    getRepository()
      .get(id)
      .then((d) => {
        if (!alive) return;
        if (!d) return setStatus("missing");
        useStudio.getState().load(d);
        setStatus("ready");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
  const pointer = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      const { drag } = useDnd.getState();
      const d = useStudio.getState().doc;
      if (drag && d) useDnd.setState({ target: computeDropTarget(d, drag, e.clientX, e.clientY) });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  if (status === "missing")
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-sm">
        <p>{t("This component does not exist (or was deleted).")}</p>
        <Button asChild variant="outline">
          <Link href="/">{t("Back to my components")}</Link>
        </Button>
      </div>
    );
  if (status === "loading" || !doc || doc.id !== id) return <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">{t("Loading…")}</div>;

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData;
    const d = useStudio.getState().doc!;
    const label = data.kind === "new" ? translate(getLocale(), findBrick(data.brickId)?.label ?? "") : translateNodeName(getLocale(), d.nodes[data.nodeId]?.name ?? "");
    useDnd.setState({ drag: data, target: null, label });
    useStudio.getState().set({ dragging: true });
  };
  const onDragEnd = () => {
    const { drag, target } = useDnd.getState();
    const s = useStudio.getState();
    if (drag && target) {
      if (drag.kind === "new") s.addBrick(drag.brickId, target.parentId, target.slot, target.index);
      else {
        s.move(drag.nodeId, target.parentId, target.slot, target.index);
        s.select(drag.nodeId);
      }
    }
    useDnd.setState({ drag: null, target: null });
    s.set({ dragging: false });
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragEnd} autoScroll={false}>
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <TopBar saveState={saveState} />
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[264px] shrink-0 flex-col border-r bg-sidebar" aria-label={t("Bricks and layers")}>
            <div className="flex min-h-0 flex-[1.2] flex-col border-b">
              <div className="px-3 pt-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t("Bricks")}</div>
              <BrickLibrary />
            </div>
            <LayerTree />
          </aside>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Canvas />
          </main>
          <RightPanel />
        </div>
      </div>
      <DropIndicator />
      <DragOverlay dropAnimation={null} style={{ pointerEvents: "none" }}>
        <DragLabel />
      </DragOverlay>
    </DndContext>
  );
}

function DragLabel() {
  const drag = useDnd((s) => s.drag);
  const label = useDnd((s) => s.label);
  const hasTarget = useDnd((s) => !!s.target);
  if (!drag) return null;
  const icon = drag.kind === "new" ? findBrick(drag.brickId)?.icon : findBrick(useStudio.getState().doc?.nodes[drag.nodeId]?.brick ?? "")?.icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-[12px] font-medium shadow-lg ${hasTarget ? "" : "opacity-70"}`}>
      <BrickIcon name={icon ?? "Box"} className="size-3.5" />
      {label}
    </div>
  );
}
