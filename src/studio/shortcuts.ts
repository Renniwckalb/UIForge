"use client";
/** Gestionnaire de raccourcis du studio : détecte les éléments qui partagent un même raccourci. */
import { findBrick } from "@/forge/bricks/registry";
import type { ComponentDoc, NodeId } from "@/forge/model/types";
import { normalizeShortcut } from "@/forge/runtime/shortcut";

export type ShortcutUse = { nodeId: NodeId; name: string; shortcut: string; prop: string };

export function shortcutUses(doc: ComponentDoc): ShortcutUse[] {
  const out: ShortcutUse[] = [];
  for (const n of Object.values(doc.nodes)) {
    const b = findBrick(n.brick);
    if (b?.effect?.kind !== "hotkey") continue;
    if (n.props[b.effect.enableProp] === false) continue;
    out.push({ nodeId: n.id, name: n.name, shortcut: String(n.props[b.effect.shortcutProp] ?? ""), prop: b.effect.shortcutProp });
  }
  return out;
}

/** nodeId → autres éléments utilisant le même raccourci */
export function shortcutConflicts(doc: ComponentDoc): Map<NodeId, ShortcutUse[]> {
  const uses = shortcutUses(doc);
  const map = new Map<NodeId, ShortcutUse[]>();
  for (const u of uses) {
    const others = uses.filter((o) => o.nodeId !== u.nodeId && normalizeShortcut(o.shortcut) === normalizeShortcut(u.shortcut));
    if (others.length) map.set(u.nodeId, others);
  }
  return map;
}

const CANDIDATES = ["mod+k", "mod+j", "mod+p", "mod+u", "mod+o", "mod+/", "mod+shift+k", "mod+shift+p", "alt+k"];

/** Premier raccourci libre à proposer pour un élément */
export function suggestShortcut(doc: ComponentDoc, nodeId: NodeId): string {
  const taken = new Set(shortcutUses(doc).filter((u) => u.nodeId !== nodeId).map((u) => normalizeShortcut(u.shortcut)));
  return CANDIDATES.find((c) => !taken.has(normalizeShortcut(c))) ?? "mod+shift+l";
}
