"use client";
import { create } from "zustand";
import { produce, type Draft } from "immer";
import type { ComponentDoc, Diagnostic, NodeId, StyleState } from "../model/types";
import { canDrop, createNode, duplicateNode, insertNode, moveNode, removeNode, slotOf } from "../model/ops";
import { findBrick } from "../bricks/registry";

export type ChangeSource = "visual" | "code" | "css" | "json" | "history" | "load";
export type Viewport = "mobile" | "tablet" | "desktop";
export type RightTab = "behavior" | "style" | "theme" | "texts" | "code";

export const VIEWPORT_WIDTH: Record<Viewport, number> = { mobile: 390, tablet: 820, desktop: 1280 };

type UpdateOpts = { coalesce?: string; source?: ChangeSource };

type StudioState = {
  doc: ComponentDoc | null;
  past: ComponentDoc[];
  future: ComponentDoc[];
  coalesce: { key: string; at: number } | null;
  revision: number;
  lastSource: ChangeSource;

  selectedId: NodeId | null;
  hoveredId: NodeId | null;
  viewport: Viewport;
  scheme: "light" | "dark";
  mode: "edit" | "live";
  forceState: StyleState | null;
  rightTab: RightTab;
  replayKey: number;
  dragging: boolean;
  diagnostics: Record<"code" | "css" | "json", Diagnostic[]>;

  load: (doc: ComponentDoc) => void;
  update: (recipe: (d: Draft<ComponentDoc>) => void, opts?: UpdateOpts) => void;
  replaceDoc: (doc: ComponentDoc, source: ChangeSource) => void;
  undo: () => void;
  redo: () => void;
  select: (id: NodeId | null) => void;
  hover: (id: NodeId | null) => void;
  set: (p: Partial<Pick<StudioState, "viewport" | "scheme" | "mode" | "forceState" | "rightTab" | "dragging" | "replayKey">>) => void;
  setDiagnostics: (kind: "code" | "css" | "json", d: Diagnostic[]) => void;

  addBrick: (brickId: string, parentId: NodeId, slot: string, index: number) => NodeId | null;
  move: (id: NodeId, parentId: NodeId, slot: string, index: number) => void;
  remove: (id: NodeId) => void;
  duplicate: (id: NodeId) => void;
  rename: (id: NodeId, name: string) => void;
};

const HISTORY_LIMIT = 150;
const COALESCE_MS = 900;

export const useStudio = create<StudioState>((set, get) => ({
  doc: null,
  past: [],
  future: [],
  coalesce: null,
  revision: 0,
  lastSource: "load",
  selectedId: null,
  hoveredId: null,
  viewport: "mobile", // mobile = breakpoint « base » : les réglages s'appliquent à tous les écrans
  scheme: "light",
  mode: "edit",
  forceState: null,
  rightTab: "behavior",
  replayKey: 0,
  dragging: false,
  diagnostics: { code: [], css: [], json: [] },

  load: (doc) =>
    set({ doc, past: [], future: [], coalesce: null, revision: get().revision + 1, lastSource: "load", selectedId: null, scheme: doc.theme.defaultScheme, diagnostics: { code: [], css: [], json: [] } }),

  update: (recipe, opts = {}) => {
    const { doc, past, coalesce } = get();
    if (!doc) return;
    const next = produce(doc, (d) => {
      recipe(d);
    });
    if (next === doc) return;
    const stamped = produce(next, (d) => {
      d.meta.updatedAt = new Date().toISOString();
    });
    const now = Date.now();
    const merge = opts.coalesce && coalesce && coalesce.key === opts.coalesce && now - coalesce.at < COALESCE_MS;
    set({
      doc: stamped,
      past: merge ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      coalesce: opts.coalesce ? { key: opts.coalesce, at: now } : null,
      revision: get().revision + 1,
      lastSource: opts.source ?? "visual",
    });
  },

  replaceDoc: (doc, source) => {
    const cur = get().doc;
    if (!cur) return;
    const now = Date.now();
    const { coalesce } = get();
    const merge = coalesce && coalesce.key === `replace:${source}` && now - coalesce.at < COALESCE_MS * 2;
    const next = { ...doc, id: cur.id, meta: { ...doc.meta, createdAt: cur.meta.createdAt, updatedAt: new Date().toISOString() } };
    const sel = get().selectedId;
    set({
      doc: next,
      past: merge ? get().past : [...get().past, cur].slice(-HISTORY_LIMIT),
      future: [],
      coalesce: { key: `replace:${source}`, at: now },
      revision: get().revision + 1,
      lastSource: source,
      selectedId: sel && next.nodes[sel] ? sel : null,
    });
  },

  undo: () => {
    const { past, doc, future, selectedId } = get();
    if (!past.length || !doc) return;
    const prev = past[past.length - 1];
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future],
      coalesce: null,
      revision: get().revision + 1,
      lastSource: "history",
      selectedId: selectedId && prev.nodes[selectedId] ? selectedId : null,
    });
  },
  redo: () => {
    const { past, doc, future, selectedId } = get();
    if (!future.length || !doc) return;
    const next = future[0];
    set({
      doc: next,
      past: [...past, doc],
      future: future.slice(1),
      coalesce: null,
      revision: get().revision + 1,
      lastSource: "history",
      selectedId: selectedId && next.nodes[selectedId] ? selectedId : null,
    });
  },

  select: (id) => set({ selectedId: id, forceState: null }),
  hover: (id) => (get().hoveredId === id ? undefined : set({ hoveredId: id })),
  set: (p) => set(p),
  setDiagnostics: (kind, d) => set({ diagnostics: { ...get().diagnostics, [kind]: d } }),

  addBrick: (brickId, parentId, slot, index) => {
    const doc = get().doc;
    if (!doc || !canDrop(doc, brickId, parentId, slot)) return null;
    let newId: NodeId | null = null;
    get().update((d) => {
      const n = createNode(d as ComponentDoc, brickId);
      insertNode(d as ComponentDoc, n, parentId, slot, index);
      newId = n.id;
    });
    if (newId) set({ selectedId: newId });
    return newId;
  },
  move: (id, parentId, slot, index) => {
    const doc = get().doc;
    const n = doc?.nodes[id];
    if (!doc || !n || !canDrop(doc, n.brick, parentId, slot, id)) return;
    const loc = slotOf(doc, id);
    if (loc && loc.parentId === parentId && loc.slot === slot && (loc.index === index || loc.index + 1 === index)) return;
    get().update((d) => moveNode(d as ComponentDoc, id, parentId, slot, index));
  },
  remove: (id) => {
    const doc = get().doc;
    if (!doc || id === doc.rootId) return;
    const parent = doc.nodes[id]?.parentId ?? null;
    get().update((d) => removeNode(d as ComponentDoc, id));
    set({ selectedId: parent });
  },
  duplicate: (id) => {
    let newId: NodeId | null = null;
    get().update((d) => {
      newId = duplicateNode(d as ComponentDoc, id);
    });
    if (newId) set({ selectedId: newId });
  },
  rename: (id, name) => get().update((d) => void (d.nodes[id] && (d.nodes[id].name = name)), { coalesce: `rename:${id}` }),
}));

export function useSelectedNode() {
  return useStudio((s) => (s.doc && s.selectedId ? (s.doc.nodes[s.selectedId] ?? null) : null));
}

export function brickOf(id: string | undefined) {
  return id ? findBrick(id) : undefined;
}
