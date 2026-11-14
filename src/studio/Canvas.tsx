"use client";
import { getLocale, tr, translate, translateNodeName } from "@/i18n/core";
import { useLocale } from "@/i18n/react";
import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ComponentRenderer } from "@/forge/runtime/Renderer";
import { useStudio, VIEWPORT_WIDTH } from "@/forge/store/studio";
import { findBrick } from "@/forge/bricks/registry";

function useElementWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

type Box = { x: number; y: number; w: number; h: number };

function measure(container: HTMLElement, id: string | null): Box | null {
  if (!id) return null;
  const el = container.querySelector(`[data-forge-id="${CSS.escape(id)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return { x: r.left - c.left + container.scrollLeft, y: r.top - c.top + container.scrollTop, w: r.width, h: r.height };
}

function SelectionOverlay({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  useLocale(); // nouveau rendu au changement de langue
  const selectedId = useStudio((s) => s.selectedId);
  const hoveredId = useStudio((s) => s.hoveredId);
  const node = useStudio((s) => (s.selectedId ? s.doc?.nodes[s.selectedId] : undefined));
  const isRoot = useStudio((s) => s.selectedId === s.doc?.rootId);
  const [boxes, setBoxes] = React.useState<{ sel: Box | null; hov: Box | null }>({ sel: null, hov: null });
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `canvas:${selectedId ?? "none"}`,
    data: { kind: "move", nodeId: selectedId },
    disabled: !selectedId || isRoot,
  });

  React.useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      const c = container.current;
      if (c) {
        const sel = measure(c, selectedId);
        const hov = hoveredId !== selectedId ? measure(c, hoveredId) : null;
        const key = JSON.stringify([sel, hov]);
        if (key !== last) {
          last = key;
          setBoxes({ sel, hov });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [container, selectedId, hoveredId]);

  const brick = node ? findBrick(node.brick) : undefined;
  return (
    <>
      {boxes.hov && (
        <div className="pointer-events-none absolute z-20 rounded-[2px] outline-1 outline-dashed outline-[#2563eb]/70" style={{ left: boxes.hov.x, top: boxes.hov.y, width: boxes.hov.w, height: boxes.hov.h }} />
      )}
      {boxes.sel && node && (
        <div className="pointer-events-none absolute z-30 rounded-[2px] outline-2 outline-[#2563eb]" style={{ left: boxes.sel.x, top: boxes.sel.y, width: boxes.sel.w, height: boxes.sel.h }}>
          <div className="pointer-events-auto absolute -top-6 left-[-2px] flex h-5 items-center gap-1 rounded-t-[3px] bg-[#2563eb] pr-1.5 pl-0.5 text-[11px] whitespace-nowrap text-white">
            {!isRoot ? (
              <span ref={setNodeRef} {...attributes} {...listeners} className="flex cursor-grab items-center" aria-label={translate(getLocale(), "Move {name}", { name: translateNodeName(getLocale(), node.name) })}>
                <GripVertical className="size-3" />
              </span>
            ) : (
              <span className="w-1" />
            )}
            {translateNodeName(getLocale(), node.name)}
            <span className="opacity-70">· {brick?.library.name}</span>
          </div>
        </div>
      )}
    </>
  );
}

export function LivePreview({ width, zoom }: { width: number; zoom: number }) {
  useLocale();
  const doc = useStudio((s) => s.doc);
  const scheme = useStudio((s) => s.scheme);
  const replayKey = useStudio((s) => s.replayKey);
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === "forge:ready") setReady(true);
      if (e.data?.type === "forge:navigate") toast(tr("Navigating to {href}", { href: e.data.href }), { description: e.data.newTab ? tr("Would open a new tab.") : tr("In your project, the page would change here.") });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  React.useEffect(() => {
    if (!ready || !doc) return;
    ref.current?.contentWindow?.postMessage({ type: "forge:render", doc, scheme, replayKey }, window.location.origin);
  }, [ready, doc, scheme, replayKey]);

  // transform plutôt que zoom : l'iframe garde la vraie largeur du viewport simulé (media queries exactes)
  return (
    <div className="relative h-full shrink-0" style={{ width: width * zoom }}>
      <iframe
        ref={ref}
        src="/preview"
        title={translate(getLocale(), "Interactive preview")}
        className="absolute top-0 left-0 block rounded-md border bg-white shadow-sm"
        style={{ width, height: `${100 / zoom}%`, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
      />
    </div>
  );
}

export function Canvas() {
  const doc = useStudio((s) => s.doc);
  const mode = useStudio((s) => s.mode);
  const viewport = useStudio((s) => s.viewport);
  const scheme = useStudio((s) => s.scheme);
  const selectedId = useStudio((s) => s.selectedId);
  const forceState = useStudio((s) => s.forceState);
  const replayKey = useStudio((s) => s.replayKey);
  const dragging = useStudio((s) => s.dragging);
  const outer = React.useRef<HTMLDivElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const avail = useElementWidth(outer);
  const width = VIEWPORT_WIDTH[viewport];
  const zoom = avail ? Math.min(1, (avail - 48) / width) : 1;

  if (!doc) return null;

  const onClickCapture = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-forge-id]");
    const t = e.target as HTMLElement;
    const editable = t.closest("input, textarea, [contenteditable]");
    if (!editable) e.preventDefault();
    e.stopPropagation();
    useStudio.getState().select(el ? el.getAttribute("data-forge-id") : doc.rootId);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-forge-id]");
    useStudio.getState().hover(el ? el.getAttribute("data-forge-id") : null);
  };

  const pageBg = doc.theme.color[scheme].background;

  return (
    <div ref={outer} className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f4f4f5] dark:bg-neutral-900">
      <div className="pointer-events-none absolute top-2 right-3 z-10 text-[11px] text-muted-foreground tabular-nums">
        {width}px{zoom < 1 ? ` · ${Math.round(zoom * 100)} %` : ""}
      </div>
      {mode === "live" ? (
        <div className="flex min-h-0 flex-1 justify-center p-6 pt-8">
          <LivePreview width={width} zoom={zoom} />
        </div>
      ) : (
        <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto p-6 pt-8" onMouseLeave={() => useStudio.getState().hover(null)}>
          <div
            data-forge-canvas
            className="forge-canvas relative mx-auto min-h-[calc(100%-8px)] rounded-md border shadow-sm"
            style={{ width, zoom, background: pageBg }}
            onClickCapture={onClickCapture}
            onMouseMove={onMouseMove}
          >
            <ComponentRenderer doc={doc} mode="edit" scheme={scheme} selectedId={selectedId} forceState={forceState} replayKey={replayKey} showHiddenSlots={dragging} breakpoints={width} />
          </div>
          <SelectionOverlay container={scroller} />
        </div>
      )}
    </div>
  );
}
