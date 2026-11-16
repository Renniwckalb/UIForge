"use client";
import { useT } from "@/i18n/react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BringToFront,
  Check,
  ChevronLeft,
  Circle,
  Copy,
  Diamond,
  Download,
  Ellipse,
  Eraser,
  Grid3x3,
  Heart,
  Hexagon,
  ImageDown,
  Minus,
  MousePointer2,
  Pencil,
  Pentagon,
  RectangleHorizontal,
  Redo2,
  SendToBack,
  Square,
  SquareRoundCorner,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColorInput, Field, Section, Segmented, SliderInput, TextInput } from "@/studio/panels/controls";
import {
  bbox,
  constrainDraw,
  DRAWING_STORAGE_KEY,
  DEFAULT_STYLE,
  editorMarkup,
  finalizePencil,
  isDegenerate,
  isLinear,
  resizeShape,
  thinPoints,
  toSvg,
  type Dash,
  type Drawing,
  type Handle,
  type Shape,
  type ShapeType,
  type Style,
} from "./shapes";

type Tool = "select" | "eraser" | ShapeType;

const TOOLS: { id: Tool; label: string; icon: LucideIcon; key: string }[] = [
  { id: "select", label: "Select / move", icon: MousePointer2, key: "v" },
  { id: "pencil", label: "Pencil (freehand)", icon: Pencil, key: "p" },
  { id: "line", label: "Straight line", icon: Minus, key: "l" },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight, key: "a" },
  { id: "rect", label: "Rectangle", icon: RectangleHorizontal, key: "r" },
  { id: "square", label: "Square", icon: Square, key: "q" },
  { id: "roundrect", label: "Rounded rectangle", icon: SquareRoundCorner, key: "u" },
  { id: "circle", label: "Circle", icon: Circle, key: "c" },
  { id: "ellipse", label: "Ellipse", icon: Ellipse, key: "o" },
  { id: "triangle", label: "Triangle", icon: Triangle, key: "t" },
  { id: "diamond", label: "Diamond", icon: Diamond, key: "d" },
  { id: "pentagon", label: "Pentagon", icon: Pentagon, key: "5" },
  { id: "hexagon", label: "Hexagon", icon: Hexagon, key: "6" },
  { id: "star", label: "Star", icon: Star, key: "s" },
  { id: "heart", label: "Heart", icon: Heart, key: "h" },
  { id: "text", label: "Text", icon: Type, key: "x" },
  { id: "eraser", label: "Eraser", icon: Eraser, key: "e" },
];

const STORAGE_KEY = DRAWING_STORAGE_KEY;
const EMPTY: Drawing = { width: 800, height: 600, background: "#ffffff", shapes: [] };
const GRID = 10;

type Drag =
  | { kind: "draw"; id: string; sx: number; sy: number }
  | { kind: "pencil"; id: string; pts: [number, number][] }
  | { kind: "move"; orig: Shape; sx: number; sy: number }
  | { kind: "resize"; orig: Shape; handle: Handle }
  | { kind: "erase" };

function loadDrawing(): Drawing {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const d = JSON.parse(raw) as Drawing;
    return Array.isArray(d.shapes) && d.width > 0 && d.height > 0 ? d : EMPTY;
  } catch {
    return EMPTY;
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function SvgEditor() {
  const t = useT();
  const [drawing, setDrawing] = React.useState<Drawing>(loadDrawing);
  const [past, setPast] = React.useState<Drawing[]>([]);
  const [future, setFuture] = React.useState<Drawing[]>([]);
  const [tool, setTool] = React.useState<Tool>("rect");
  const [style, setStyle] = React.useState<Style>(DEFAULT_STYLE);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [snap, setSnap] = React.useState(false);
  const [crop, setCrop] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [textEdit, setTextEdit] = React.useState<{ id: string | null; x: number; y: number; value: string; left: number; top: number } | null>(null);
  /** Unités SVG par pixel écran (taille des poignées, du champ texte) */
  const [svgScale, setSvgScale] = React.useState(1);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const drag = React.useRef<Drag | null>(null);
  const before = React.useRef<Drawing | null>(null);
  const lastEdit = React.useRef<{ key: string; t: number } | null>(null);
  const drawingRef = React.useRef(drawing);
  React.useLayoutEffect(() => {
    drawingRef.current = drawing;
  });

  // Sauvegarde locale (le composant n'est rendu que dans le navigateur)
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drawing));
      } catch {
        /* stockage indisponible : le dessin reste en mémoire */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [drawing]);
  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w) setSvgScale(drawing.width / w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawing.width]);

  const selected = drawing.shapes.find((s) => s.id === selectedId) ?? null;
  const code = React.useMemo(() => toSvg(drawing, { crop }), [drawing, crop]);
  const markup = React.useMemo(() => editorMarkup(drawing.shapes), [drawing.shapes]);

  /* ——— Historique ——— */
  const commit = React.useCallback((next: Drawing | ((d: Drawing) => Drawing), coalesceKey?: string) => {
    const prev = drawingRef.current;
    const value = typeof next === "function" ? next(prev) : next;
    if (value === prev) return;
    const now = Date.now();
    const merge = coalesceKey && lastEdit.current?.key === coalesceKey && now - lastEdit.current.t < 600;
    lastEdit.current = coalesceKey ? { key: coalesceKey, t: now } : null;
    if (!merge) setPast((p) => [...p.slice(-99), prev]);
    setFuture([]);
    setDrawing(value);
  }, []);
  const undo = React.useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [drawingRef.current, ...f]);
      setDrawing(prev);
      return p.slice(0, -1);
    });
    lastEdit.current = null;
  }, []);
  const redo = React.useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      setPast((p) => [...p, drawingRef.current]);
      setDrawing(f[0]);
      return f.slice(1);
    });
    lastEdit.current = null;
  }, []);

  const updateShape = React.useCallback(
    (id: string, patch: Partial<Shape>, coalesceKey?: string) =>
      commit((d) => ({ ...d, shapes: d.shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)) }), coalesceKey),
    [commit],
  );
  const removeShape = React.useCallback(
    (id: string) => {
      commit((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [commit],
  );
  const duplicate = React.useCallback(() => {
    const s = drawingRef.current.shapes.find((x) => x.id === selectedId);
    if (!s) return;
    const copy = { ...s, id: nanoid(8), x: s.x + 16, y: s.y + 16 };
    commit((d) => ({ ...d, shapes: [...d.shapes, copy] }));
    setSelectedId(copy.id);
  }, [commit, selectedId]);
  const reorder = (dir: "front" | "back") => {
    if (!selected) return;
    commit((d) => {
      const rest = d.shapes.filter((s) => s.id !== selected.id);
      return { ...d, shapes: dir === "front" ? [...rest, selected] : [selected, ...rest] };
    });
  };

  /* ——— Coordonnées ——— */
  const point = (e: { clientX: number; clientY: number }, snapIt = snap): [number, number] => {
    const svg = svgRef.current!;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const r = (n: number) => (snapIt ? Math.round(n / GRID) * GRID : Math.round(n * 10) / 10);
    return [r(p.x), r(p.y)];
  };
  const shapeAt = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY)?.closest("[data-shape-id]");
    return el?.getAttribute("data-shape-id") ?? null;
  };

  /* ——— Texte ——— */
  const textRef = React.useRef(textEdit);
  React.useLayoutEffect(() => {
    textRef.current = textEdit;
  }, [textEdit]);
  const openText = (x: number, y: number, id: string | null, value = "") => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    const host = svg?.parentElement?.getBoundingClientRect();
    if (!ctm || !host) return;
    const p = new DOMPoint(x, y).matrixTransform(ctm);
    setTextEdit({ id, x, y, value, left: p.x - host.left, top: p.y - host.top });
  };
  const commitText = () => {
    // lu dans une ref : le blur et le clic suivant ne doivent valider qu'une seule fois
    const t = textRef.current;
    textRef.current = null;
    setTextEdit(null);
    if (!t) return;
    const value = t.value.replace(/\s+$/, "");
    if (t.id) {
      if (!value.trim()) removeShape(t.id);
      else updateShape(t.id, { text: value });
      return;
    }
    if (!value.trim()) return;
    const s: Shape = {
      id: nanoid(8),
      type: "text",
      x: t.x,
      y: t.y,
      w: 0,
      h: 0,
      text: value,
      stroke: style.stroke,
      fill: style.fill === "none" ? style.stroke : style.fill,
      strokeWidth: 0,
      opacity: style.opacity,
      dash: "solid",
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
    };
    commit((d) => ({ ...d, shapes: [...d.shapes, s] }));
    setSelectedId(s.id);
  };

  /* ——— Pointeur ——— */
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    if (textEdit) {
      commitText();
      return;
    }
    const target = e.target as Element;
    const handle = target.closest("[data-handle]")?.getAttribute("data-handle") as Handle | null;
    const [x, y] = point(e);
    before.current = drawingRef.current;
    svgRef.current?.setPointerCapture(e.pointerId);

    if (handle && selected) {
      drag.current = { kind: "resize", orig: selected, handle };
      return;
    }
    const hit = target.closest("[data-shape-id]")?.getAttribute("data-shape-id") ?? null;
    if (tool === "select") {
      setSelectedId(hit);
      const s = drawingRef.current.shapes.find((sh) => sh.id === hit);
      drag.current = s ? { kind: "move", orig: s, sx: x, sy: y } : null;
      return;
    }
    if (tool === "eraser") {
      if (hit) setDrawing((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== hit) }));
      drag.current = { kind: "erase" };
      return;
    }
    if (tool === "text") {
      // évite que le mousedown par défaut retire le focus du champ texte qui s'ouvre
      e.preventDefault();
      drag.current = null;
      const s = drawingRef.current.shapes.find((sh) => sh.id === hit && sh.type === "text");
      if (s) openText(s.x, s.y, s.id, s.text);
      else openText(x, y, null);
      return;
    }
    const id = nanoid(8);
    if (tool === "pencil") {
      const [rx, ry] = point(e, false);
      drag.current = { kind: "pencil", id, pts: [[rx, ry]] };
      return;
    }
    const s: Shape = {
      id,
      type: tool,
      x,
      y,
      w: 0,
      h: 0,
      stroke: style.stroke,
      fill: isLinear(tool) ? "none" : style.fill,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      dash: style.dash,
      radius: tool === "roundrect" ? style.radius : undefined,
    };
    setDrawing((d) => ({ ...d, shapes: [...d.shapes, s] }));
    drag.current = { kind: "draw", id, sx: x, sy: y };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = drag.current;
    if (!g) return;
    if (g.kind === "erase") {
      const id = shapeAt(e.clientX, e.clientY);
      if (id) setDrawing((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== id) }));
      return;
    }
    if (g.kind === "pencil") {
      g.pts.push(point(e, false));
      const s = finalizePencil(g.id, thinPoints(g.pts), style);
      setDrawing((d) => ({ ...d, shapes: d.shapes.some((x) => x.id === g.id) ? d.shapes.map((x) => (x.id === g.id ? s : x)) : [...d.shapes, s] }));
      return;
    }
    const [x, y] = point(e);
    if (g.kind === "draw") {
      setDrawing((d) => ({
        ...d,
        shapes: d.shapes.map((s) => {
          if (s.id !== g.id) return s;
          const [w, h] = constrainDraw(s.type, x - g.sx, y - g.sy, e.shiftKey);
          return { ...s, w, h };
        }),
      }));
    } else if (g.kind === "move") {
      const dx = x - g.sx;
      const dy = y - g.sy;
      setDrawing((d) => ({ ...d, shapes: d.shapes.map((s) => (s.id === g.orig.id ? { ...s, x: g.orig.x + dx, y: g.orig.y + dy } : s)) }));
    } else if (g.kind === "resize") {
      const next = resizeShape(g.orig, g.handle, x, y, e.shiftKey);
      setDrawing((d) => ({ ...d, shapes: d.shapes.map((s) => (s.id === g.orig.id ? next : s)) }));
    }
  };

  const onPointerUp = () => {
    const g = drag.current;
    drag.current = null;
    const prev = before.current;
    before.current = null;
    if (!g || !prev) return;
    let cur = drawingRef.current;
    if (g.kind === "draw" || g.kind === "pencil") {
      const s = cur.shapes.find((x) => x.id === g.id);
      if (!s || isDegenerate(s)) {
        cur = { ...cur, shapes: cur.shapes.filter((x) => x.id !== g.id) };
        setDrawing(cur);
      } else if (g.kind === "draw" && !isLinear(s.type)) {
        // boîte normalisée une fois le tracé terminé
        const b = bbox(s);
        cur = { ...cur, shapes: cur.shapes.map((x) => (x.id === g.id ? { ...x, ...b } : x)) };
        setDrawing(cur);
      }
    }
    if (cur !== prev && JSON.stringify(cur.shapes) !== JSON.stringify(prev.shapes)) {
      setPast((p) => [...p.slice(-99), prev]);
      setFuture([]);
      lastEdit.current = null;
    }
  };

  /* ——— Clavier ——— */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && k === "y") {
        e.preventDefault();
        redo();
      } else if (mod && k === "d") {
        e.preventDefault();
        duplicate();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeShape(selectedId);
      } else if (e.key === "Escape") setSelectedId(null);
      else if (e.key.startsWith("Arrow") && selectedId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const s = drawingRef.current.shapes.find((x) => x.id === selectedId);
        if (s) updateShape(selectedId, { x: s.x + dx, y: s.y + dy }, `nudge:${selectedId}`);
      } else if (!mod && !e.altKey) {
        const t = TOOLS.find((x) => x.key === k);
        if (t) setTool(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicate, removeShape, updateShape, selectedId]);

  /* ——— Style : appliqué à la sélection, sinon aux prochaines formes ——— */
  const current: Style = selected
    ? {
        stroke: selected.stroke,
        fill: selected.fill,
        strokeWidth: selected.strokeWidth,
        opacity: selected.opacity,
        dash: selected.dash,
        radius: selected.radius ?? style.radius,
        fontSize: selected.fontSize ?? style.fontSize,
        fontFamily: selected.fontFamily ?? style.fontFamily,
      }
    : style;
  const setStyleKey = <K extends keyof Style>(key: K, value: Style[K]) => {
    setStyle((s) => ({ ...s, [key]: value }));
    if (selected) updateShape(selected.id, { [key]: value } as Partial<Shape>, `${selected.id}:${key}`);
  };

  /* ——— Export ——— */
  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("SVG code copied"));
    window.setTimeout(() => setCopied(false), 1500);
  };
  const downloadSvg = () => {
    downloadBlob(new Blob([code], { type: "image/svg+xml" }), "drawing.svg");
    toast.success(t("{file} downloaded", { file: "drawing.svg" }));
  };
  const downloadPng = () => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([code], { type: "image/svg+xml" }));
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b && (downloadBlob(b, "drawing.png"), toast.success(t("{file} downloaded", { file: "drawing.png" }))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(t("PNG conversion failed"));
    };
    img.src = url;
  };
  const clearAll = () => {
    if (!drawing.shapes.length) return;
    commit((d) => ({ ...d, shapes: [] }));
    setSelectedId(null);
    toast(t("Drawing cleared"), { action: { label: t("Undo"), onClick: undo } });
  };

  /* ——— Poignées de sélection ——— */
  const handles = (() => {
    if (!selected || tool !== "select") return null;
    if (isLinear(selected.type))
      return [
        { id: "start" as Handle, x: selected.x, y: selected.y },
        { id: "end" as Handle, x: selected.x + selected.w, y: selected.y + selected.h },
      ];
    const b = bbox(selected);
    return [
      { id: "nw" as Handle, x: b.x, y: b.y },
      { id: "ne" as Handle, x: b.x + b.w, y: b.y },
      { id: "sw" as Handle, x: b.x, y: b.y + b.h },
      { id: "se" as Handle, x: b.x + b.w, y: b.y + b.h },
    ];
  })();
  const selBox = selected ? bbox(selected) : null;

  const cursor = tool === "select" ? "default" : tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair";

  return (
    <div className="flex h-dvh flex-col bg-[#fafafa]">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ChevronLeft /> {t("My components")}
          </Link>
        </Button>
        <span className="text-[14px] font-semibold tracking-tight">{t("SVG drawing")}</span>
        <span className="hidden text-[12px] text-muted-foreground sm:inline">{t("Draw, the SVG code updates live")}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label={t("Undo (Ctrl+Z)")} onClick={undo} disabled={!past.length} icon={Undo2} />
          <IconButton label={t("Redo (Ctrl+Shift+Z)")} onClick={redo} disabled={!future.length} icon={Redo2} />
          <IconButton label={t("Clear all")} onClick={clearAll} disabled={!drawing.shapes.length} icon={Trash2} />
          <Button size="sm" variant="outline" onClick={downloadPng} disabled={!drawing.shapes.length && drawing.background === "none"}>
            <ImageDown /> PNG
          </Button>
          <Button size="sm" onClick={downloadSvg}>
            <Download /> {t("Download the SVG")}
          </Button>
          <LanguageSwitcher compact />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Outils */}
        <nav aria-label={t("Drawing tools")} className="flex w-12 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r bg-background py-2">
          {TOOLS.map((tl, i) => (
            <React.Fragment key={tl.id}>
              {(i === 1 || i === TOOLS.length - 2) && <div className="my-1 h-px w-6 bg-border" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t(tl.label)}
                    aria-pressed={tool === tl.id}
                    onClick={() => {
                      setTool(tl.id);
                      if (tl.id !== "select") setSelectedId(null);
                    }}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md transition-colors ${tool === tl.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <tl.icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t(tl.label)} <kbd className="ml-1 font-mono opacity-70">{tl.key.toUpperCase()}</kbd>
                </TooltipContent>
              </Tooltip>
            </React.Fragment>
          ))}
        </nav>

        {/* Canvas */}
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto p-6">
          <div className="relative max-h-full max-w-full shadow-sm ring-1 ring-black/10" style={{ aspectRatio: `${drawing.width} / ${drawing.height}`, width: `min(100%, ${drawing.width}px)` }}>
            <svg
              ref={svgRef}
              role="img"
              aria-label={t("Drawing area")}
              viewBox={`0 0 ${drawing.width} ${drawing.height}`}
              className="block size-full touch-none select-none"
              style={{
                cursor,
                background: drawing.background === "none" ? "repeating-conic-gradient(#e4e4e7 0 25%, #fff 0 50%) 0 0 / 16px 16px" : drawing.background,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDoubleClick={(e) => {
                const id = (e.target as Element).closest("[data-shape-id]")?.getAttribute("data-shape-id");
                const s = drawing.shapes.find((x) => x.id === id && x.type === "text");
                if (s) openText(s.x, s.y, s.id, s.text);
              }}
            >
              {snap && (
                <g pointerEvents="none" opacity={0.5}>
                  <defs>
                    <pattern id="svg-editor-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                      <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#d4d4d8" strokeWidth={0.5} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#svg-editor-grid)" />
                </g>
              )}
              <g dangerouslySetInnerHTML={{ __html: markup }} />
              {selBox && tool === "select" && selected && (
                <g pointerEvents="none">
                  {!isLinear(selected.type) && (
                    <rect x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h} fill="none" stroke="#2563eb" strokeWidth={1.25 * svgScale} strokeDasharray={`${4 * svgScale} ${3 * svgScale}`} />
                  )}
                </g>
              )}
              {handles?.map((h) => (
                <rect
                  key={h.id}
                  data-handle={h.id}
                  x={h.x - 5 * svgScale}
                  y={h.y - 5 * svgScale}
                  width={10 * svgScale}
                  height={10 * svgScale}
                  rx={2 * svgScale}
                  fill="#fff"
                  stroke="#2563eb"
                  strokeWidth={1.5 * svgScale}
                  style={{ cursor: h.id === "nw" || h.id === "se" ? "nwse-resize" : h.id === "ne" || h.id === "sw" ? "nesw-resize" : "move" }}
                />
              ))}
            </svg>
            {textEdit && (
              <textarea
                autoFocus
                aria-label={t("Text")}
                value={textEdit.value}
                rows={Math.max(1, textEdit.value.split("\n").length)}
                onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
                onBlur={commitText}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitText();
                  }
                  if (e.key === "Escape") setTextEdit(null);
                }}
                placeholder={t("Your text…")}
                className="absolute min-w-40 resize-none rounded border border-[#2563eb] bg-white/90 p-0 leading-[1.2] outline-none"
                style={{ left: textEdit.left, top: textEdit.top, fontSize: (current.fontSize || 32) / svgScale, fontFamily: current.fontFamily, color: current.fill === "none" ? current.stroke : current.fill }}
              />
            )}
          </div>
          {!drawing.shapes.length && (
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-[12px] text-muted-foreground shadow-sm ring-1 ring-black/5">
              {t("Pick a shape on the left then drag on the area · Shift = proportions / 15° angles")}
            </p>
          )}
        </main>

        {/* Propriétés + code */}
        <aside className="flex w-[340px] shrink-0 flex-col border-l bg-background">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Section title={selected ? `${t("Selected shape")} · ${t(TOOLS.find((x) => x.id === selected.type)?.label ?? selected.type)}` : t("Style of new shapes")}>
              <Field label={t("Stroke")}>
                <ColorInput value={current.stroke} onChange={(v) => setStyleKey("stroke", v)} ariaLabel={t("Stroke color")} />
              </Field>
              <Field label={t("Fill")}>
                <div className="flex items-center gap-2">
                  <div className={`min-w-0 flex-1 ${current.fill === "none" ? "pointer-events-none opacity-40" : ""}`}>
                    <ColorInput value={current.fill === "none" ? "#ffffff" : current.fill} onChange={(v) => setStyleKey("fill", v)} ariaLabel={t("Fill color")} />
                  </div>
                  <Switch aria-label={t("Fill the shape")} checked={current.fill !== "none"} onCheckedChange={(on) => setStyleKey("fill", on ? "#93c5fd" : "none")} />
                </div>
              </Field>
              <Field label={t("Thickness")}>
                <SliderInput value={current.strokeWidth} min={0} max={40} step={1} onChange={(v) => setStyleKey("strokeWidth", v)} format={(v) => `${v} px`} />
              </Field>
              <Field label={t("Opacity")}>
                <SliderInput value={current.opacity} min={0.05} max={1} step={0.05} onChange={(v) => setStyleKey("opacity", v)} format={(v) => `${Math.round(v * 100)}%`} />
              </Field>
              <Field label={t("Line style")}>
                <Segmented
                  ariaLabel={t("Line style")}
                  value={current.dash}
                  onChange={(v) => setStyleKey("dash", v as Dash)}
                  options={[
                    { value: "solid", label: t("Solid") },
                    { value: "dashed", label: t("Dashed") },
                    { value: "dotted", label: t("Dotted") },
                  ]}
                />
              </Field>
              {(selected ? selected.type === "roundrect" : tool === "roundrect") && (
                <Field label={t("Rounding")}>
                  <SliderInput value={current.radius} min={0} max={120} step={1} onChange={(v) => setStyleKey("radius", v)} format={(v) => `${v} px`} />
                </Field>
              )}
              {(selected ? selected.type === "text" : tool === "text") && (
                <>
                  <Field label={t("Size")}>
                    <SliderInput value={current.fontSize} min={8} max={160} step={1} onChange={(v) => setStyleKey("fontSize", v)} format={(v) => `${v} px`} />
                  </Field>
                  <Field label={t("Font")}>
                    <Segmented
                      ariaLabel={t("Font")}
                      value={current.fontFamily}
                      onChange={(v) => setStyleKey("fontFamily", v)}
                      options={[
                        { value: "system-ui, sans-serif", label: "Sans" },
                        { value: "Georgia, serif", label: "Serif" },
                        { value: "ui-monospace, monospace", label: "Mono" },
                      ]}
                    />
                  </Field>
                  {selected?.type === "text" && (
                    <Field label={t("Content")}>
                      <TextInput value={selected.text ?? ""} onChange={(e) => updateShape(selected.id, { text: e.target.value }, `${selected.id}:text`)} aria-label={t("Text content")} />
                    </Field>
                  )}
                </>
              )}
              {selected && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button size="sm" variant="outline" onClick={() => reorder("front")}>
                    <BringToFront /> {t("Bring to front")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reorder("back")}>
                    <SendToBack /> {t("Send to back")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={duplicate}>
                    <Copy /> {t("Duplicate")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeShape(selected.id)}>
                    <Trash2 /> {t("Delete")}
                  </Button>
                </div>
              )}
            </Section>
            <Section title={t("Drawing area")} defaultOpen={false}>
              <Field label={t("Size (px)")}>
                <div className="flex items-center gap-1.5">
                  <TextInput
                    type="number"
                    min={50}
                    max={4000}
                    aria-label={t("Width")}
                    value={drawing.width}
                    onChange={(e) => {
                      const v = Math.min(4000, Math.max(50, Number(e.target.value) || 50));
                      commit((d) => ({ ...d, width: v }), "width");
                    }}
                  />
                  <span className="text-muted-foreground">×</span>
                  <TextInput
                    type="number"
                    min={50}
                    max={4000}
                    aria-label={t("Height")}
                    value={drawing.height}
                    onChange={(e) => {
                      const v = Math.min(4000, Math.max(50, Number(e.target.value) || 50));
                      commit((d) => ({ ...d, height: v }), "height");
                    }}
                  />
                </div>
              </Field>
              <Field label={t("Background")}>
                <div className="flex items-center gap-2">
                  <div className={`min-w-0 flex-1 ${drawing.background === "none" ? "pointer-events-none opacity-40" : ""}`}>
                    <ColorInput value={drawing.background === "none" ? "#ffffff" : drawing.background} onChange={(v) => commit((d) => ({ ...d, background: v }), "bg")} ariaLabel={t("Background color")} />
                  </div>
                  <Switch aria-label={t("Colored background (otherwise transparent)")} checked={drawing.background !== "none"} onCheckedChange={(on) => commit((d) => ({ ...d, background: on ? "#ffffff" : "none" }))} />
                </div>
              </Field>
              <Field label={t("Grid")} hint={t("Snaps shapes to a 10 px grid")}>
                <div className="flex h-7 items-center gap-2">
                  <Switch aria-label={t("Snap to grid")} checked={snap} onCheckedChange={setSnap} />
                  <Grid3x3 className="size-3.5 text-muted-foreground" />
                </div>
              </Field>
            </Section>
          </div>

          <div className="flex h-[45%] min-h-56 flex-col border-t">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-[12px] font-semibold">{t("SVG code")}</span>
              <span className="text-[11px] text-muted-foreground">
                {t(drawing.shapes.length > 1 ? "{n} shapes" : "{n} shape", { n: drawing.shapes.length })} · {Math.max(1, Math.round(code.length / 102.4) / 10)} {t("KB")}
              </span>
              <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground" title={t("The viewBox is fitted to the drawn content")}>
                <Switch size="sm" checked={crop} onCheckedChange={setCrop} aria-label={t("Crop to content")} /> {t("Crop")}
              </label>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={copyCode} aria-label={t("Copy the SVG code")}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto border-t bg-muted/30 p-3 font-mono text-[11px] leading-relaxed whitespace-pre">{code}</pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, disabled, icon: Icon }: { label: string; onClick: () => void; disabled?: boolean; icon: LucideIcon }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
