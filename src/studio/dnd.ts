"use client";
/**
 * Calcul de la cible de dépôt à partir de la position du pointeur.
 * Le canvas expose data-forge-id (nœud), data-forge-slot="id:slot" (conteneur) et data-forge-empty (slot vide) ;
 * l'arbre des calques expose data-tree-id / data-tree-slot.
 */
import { create } from "zustand";
import { findBrick } from "@/forge/bricks/registry";
import { canDrop, slotOf } from "@/forge/model/ops";
import type { ComponentDoc, NodeId } from "@/forge/model/types";

export type DragData = { kind: "new"; brickId: string } | { kind: "move"; nodeId: NodeId };
export type DropTarget = {
  parentId: NodeId;
  slot: string;
  index: number;
  /** Ligne d'insertion (coordonnées viewport) */
  line: { x: number; y: number; w: number; h: number };
  /** Conteneur survolé (coordonnées viewport) */
  box?: { x: number; y: number; w: number; h: number };
};

export const useDnd = create<{ drag: DragData | null; target: DropTarget | null; label: string }>(() => ({
  drag: null,
  target: null,
  label: "",
}));

const EDGE = 6;

function brickIdOf(doc: ComponentDoc, drag: DragData) {
  return drag.kind === "new" ? drag.brickId : doc.nodes[drag.nodeId]?.brick;
}

function ok(doc: ComponentDoc, drag: DragData, parentId: NodeId, slot: string) {
  const bid = brickIdOf(doc, drag);
  if (!bid) return false;
  return canDrop(doc, bid, parentId, slot, drag.kind === "move" ? drag.nodeId : undefined);
}

function rectOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function slotTarget(doc: ComponentDoc, drag: DragData, host: Element, x: number, y: number): DropTarget | null {
  const [parentId, slot] = (host.getAttribute("data-forge-slot") ?? host.getAttribute("data-forge-empty") ?? "").split(":");
  if (!parentId || !slot || !ok(doc, drag, parentId, slot)) return null;
  const ids = (doc.nodes[parentId]?.slots[slot] ?? []).filter((id) => !(drag.kind === "move" && drag.nodeId === id));
  const box = rectOf(host);
  const cs = getComputedStyle(host);
  const horizontal = cs.display.includes("flex") && cs.flexDirection.startsWith("row");
  const grid = cs.display.includes("grid");
  const items = ids
    .map((id) => ({ id, el: host.querySelector(`[data-forge-id="${CSS.escape(id)}"]`) }))
    .filter((i): i is { id: string; el: Element } => !!i.el)
    .map((i) => ({ ...i, r: rectOf(i.el) }));
  let index = items.length;
  for (let i = 0; i < items.length; i++) {
    const r = items[i].r;
    const before = grid ? y < r.y || (y < r.y + r.h && x < r.x + r.w / 2) : horizontal ? x < r.x + r.w / 2 : y < r.y + r.h / 2;
    if (before) {
      index = i;
      break;
    }
  }
  // index dans la liste complète (y compris l'élément déplacé)
  const full = doc.nodes[parentId].slots[slot] ?? [];
  const refId = items[index]?.id;
  const fullIndex = refId ? full.indexOf(refId) : full.length;
  let line: DropTarget["line"];
  if (!items.length) line = { x: box.x + 4, y: box.y + box.h / 2 - 1, w: Math.max(box.w - 8, 8), h: 2 };
  else if (horizontal) {
    const ref = items[index]?.r ?? items[items.length - 1].r;
    const lx = items[index] ? ref.x - 3 : ref.x + ref.w + 1;
    line = { x: lx, y: ref.y, w: 2, h: ref.h };
  } else {
    const ref = items[index]?.r ?? items[items.length - 1].r;
    const ly = items[index] ? ref.y - 3 : ref.y + ref.h + 1;
    line = { x: ref.x, y: ly, w: ref.w, h: 2 };
  }
  return { parentId, slot, index: fullIndex, line, box };
}

function besideNode(doc: ComponentDoc, drag: DragData, el: Element, x: number, y: number): DropTarget | null {
  const id = el.getAttribute("data-forge-id")!;
  const loc = slotOf(doc, id);
  if (!loc || !ok(doc, drag, loc.parentId, loc.slot)) return null;
  const r = rectOf(el);
  const host = el.parentElement?.closest("[data-forge-slot]");
  const cs = host ? getComputedStyle(host) : null;
  const horizontal = !!cs && cs.display.includes("flex") && cs.flexDirection.startsWith("row");
  const after = horizontal ? x > r.x + r.w / 2 : y > r.y + r.h / 2;
  const line = horizontal ? { x: after ? r.x + r.w + 1 : r.x - 3, y: r.y, w: 2, h: r.h } : { x: r.x, y: after ? r.y + r.h + 1 : r.y - 3, w: r.w, h: 2 };
  return { parentId: loc.parentId, slot: loc.slot, index: loc.index + (after ? 1 : 0), line, box: host ? rectOf(host) : undefined };
}

export function computeCanvasTarget(doc: ComponentDoc, drag: DragData, x: number, y: number): DropTarget | null {
  let el = document.elementFromPoint(x, y);
  if (!el?.closest("[data-forge-canvas]")) return null;
  while (el && !el.hasAttribute("data-forge-canvas")) {
    if (drag.kind === "move" && el.getAttribute("data-forge-id") === drag.nodeId) {
      // On ne peut pas déposer un nœud dans lui-même : on remonte au-dessus
      el = el.parentElement;
      continue;
    }
    if (el.hasAttribute("data-forge-empty")) {
      const t = slotTarget(doc, drag, el, x, y);
      if (t) return t;
    }
    if (el.hasAttribute("data-forge-slot")) {
      const r = el.getBoundingClientRect();
      const nearEdge = x - r.left < EDGE || r.right - x < EDGE || y - r.top < EDGE || r.bottom - y < EDGE;
      if (el.hasAttribute("data-forge-id") && nearEdge) {
        const t = besideNode(doc, drag, el, x, y);
        if (t) return t;
      }
      const t = slotTarget(doc, drag, el, x, y);
      if (t) return t;
    } else if (el.hasAttribute("data-forge-id")) {
      const t = besideNode(doc, drag, el, x, y);
      if (t) return t;
    }
    el = el.parentElement;
  }
  const root = doc.nodes[doc.rootId];
  if (root) {
    const host = document.querySelector(`[data-forge-slot="${doc.rootId}:children"]`);
    if (host) return slotTarget(doc, drag, host, x, y);
  }
  return null;
}

export function computeTreeTarget(doc: ComponentDoc, drag: DragData, x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y);
  const slotRow = el?.closest("[data-tree-slot]");
  if (slotRow) {
    const [parentId, slot] = slotRow.getAttribute("data-tree-slot")!.split(":");
    if (!ok(doc, drag, parentId, slot)) return null;
    const r = rectOf(slotRow);
    return { parentId, slot, index: doc.nodes[parentId].slots[slot]?.length ?? 0, line: { x: r.x + 16, y: r.y + r.h - 1, w: r.w - 16, h: 2 }, box: r };
  }
  const row = el?.closest("[data-tree-id]");
  if (!row) return null;
  const id = row.getAttribute("data-tree-id")!;
  if (drag.kind === "move" && drag.nodeId === id) return null;
  const r = rectOf(row);
  const node = doc.nodes[id];
  const brick = node && findBrick(node.brick);
  const rel = (y - r.y) / r.h;
  const firstSlot = brick?.slots ? Object.keys(brick.slots)[0] : null;
  if (firstSlot && rel > 0.3 && rel < 0.7 && ok(doc, drag, id, firstSlot)) {
    return { parentId: id, slot: firstSlot, index: node.slots[firstSlot]?.length ?? 0, line: { x: r.x + 24, y: r.y + r.h - 1, w: r.w - 24, h: 2 }, box: r };
  }
  const loc = slotOf(doc, id);
  if (!loc || !ok(doc, drag, loc.parentId, loc.slot)) return null;
  const after = rel >= 0.5;
  return { parentId: loc.parentId, slot: loc.slot, index: loc.index + (after ? 1 : 0), line: { x: r.x, y: after ? r.y + r.h - 1 : r.y, w: r.w, h: 2 } };
}

export function computeDropTarget(doc: ComponentDoc, drag: DragData, x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y);
  if (el?.closest("[data-forge-tree]")) return computeTreeTarget(doc, drag, x, y);
  return computeCanvasTarget(doc, drag, x, y);
}
