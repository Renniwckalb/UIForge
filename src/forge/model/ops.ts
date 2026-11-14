/**
 * Opérations pures sur le modèle. Elles modifient le document passé en place :
 * le store les appelle sur un brouillon immer, les scripts/tests sur une copie.
 */
import { trValue } from "../../i18n/core";
import { getBrick, findBrick, isContainer } from "../bricks/registry";
import type { BrickDefinition } from "../bricks/types";
import { defaultTheme } from "../tokens/theme";
import type { ComponentDoc, Node, NodeId, PropValue, TextBinding } from "./types";

export const RESERVED_PROPS = new Set(["className", "colorScheme", "children", "style", "key", "ref"]);

export function newDocId() {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyDoc(name = "MyComponent"): ComponentDoc {
  const now = new Date().toISOString();
  const doc: ComponentDoc = {
    schemaVersion: 1,
    id: newDocId(),
    name,
    rootId: "",
    nodes: {},
    theme: defaultTheme(),
    exposedProps: [],
    meta: { createdAt: now, updatedAt: now },
  };
  const root = createNode(doc, "layout.stack");
  root.name = "Root";
  root.style.base = { gap: { token: "space.4" }, px: { token: "space.6" }, py: { token: "space.6" } };
  doc.nodes[root.id] = root;
  doc.rootId = root.id;
  return doc;
}

export function nextNodeId(doc: ComponentDoc, short: string): NodeId {
  let n = 1;
  while (doc.nodes[`${short}${n}`]) n++;
  return `${short}${n}`;
}

/** Tous les noms de props déjà utilisés par le composant (textes, variantes, tokens exposés) */
export function usedPropNames(doc: ComponentDoc, except?: { nodeId: NodeId; key: string }): Set<string> {
  const used = new Set<string>(RESERVED_PROPS);
  for (const n of Object.values(doc.nodes)) {
    for (const [k, t] of Object.entries(n.texts)) {
      if (except && except.nodeId === n.id && except.key === k) continue;
      used.add(t.propName);
    }
  }
  for (const e of doc.exposedProps) used.add(e.propName);
  for (const e of doc.theme.exposed) used.add(e.propName);
  return used;
}

export function uniquePropName(doc: ComponentDoc, hint: string, except?: { nodeId: NodeId; key: string }): string {
  const used = usedPropNames(doc, except);
  const base = toIdentifier(hint) || "text";
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

export function toIdentifier(s: string): string {
  const cleaned = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));
  const id = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  return /^[A-Za-z_$]/.test(id) ? id : id ? `_${id}` : "";
}

export function toPascal(s: string): string {
  const id = toIdentifier(s);
  return id ? id.charAt(0).toUpperCase() + id.slice(1) : "MyComponent";
}

export function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function defaultProps(brick: BrickDefinition): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const [k, f] of Object.entries(brick.props)) out[k] = f.default;
  return out;
}

/** Crée un nœud (non inséré) avec les valeurs par défaut de sa brique */
export function createNode(doc: ComponentDoc, brickId: string, reserved?: Set<string>): Node {
  const brick = getBrick(brickId);
  let id = nextNodeId(doc, brick.short);
  if (reserved) {
    let n = Number(id.slice(brick.short.length));
    while (doc.nodes[id] || reserved.has(id)) id = `${brick.short}${++n}`;
  }
  const texts: Record<string, TextBinding> = {};
  const taken = usedPropNames(doc);
  for (const t of brick.texts) {
    let name = toIdentifier(t.propHint);
    if (taken.has(name)) {
      let i = 2;
      while (taken.has(`${name}${i}`)) i++;
      name = `${name}${i}`;
    }
    taken.add(name);
    // texte par défaut dans la langue de l'interface (contenu du composant)
    texts[t.key] = { value: trValue(Array.isArray(t.default) ? [...t.default] : t.default), expose: true, propName: name };
  }
  const slots: Record<string, NodeId[]> = {};
  for (const s of Object.keys(brick.slots ?? {})) slots[s] = [];
  // Props exposées automatiquement (ex. raccourci des palettes cmdk)
  for (const prop of brick.exposeByDefault ?? []) {
    let name = toIdentifier(prop);
    if (taken.has(name)) {
      let i = 2;
      while (taken.has(`${name}${i}`)) i++;
      name = `${name}${i}`;
    }
    taken.add(name);
    doc.exposedProps.push({ nodeId: id, prop, propName: name });
  }
  return {
    id,
    brick: brick.id,
    name: `${brick.label} ${id.slice(brick.short.length)}`,
    parentId: null,
    slots,
    props: defaultProps(brick),
    texts,
    style: { base: structuredClone(brick.defaultStyle ?? {}) },
    interactions: [],
  };
}

export function childrenOf(doc: ComponentDoc, id: NodeId): NodeId[] {
  const n = doc.nodes[id];
  if (!n) return [];
  return Object.values(n.slots).flat();
}

/** Parcours en profondeur dans l'ordre d'affichage */
export function walk(doc: ComponentDoc, fn: (n: Node, depth: number) => void, from = doc.rootId, depth = 0) {
  const n = doc.nodes[from];
  if (!n) return;
  fn(n, depth);
  for (const c of childrenOf(doc, from)) walk(doc, fn, c, depth + 1);
}

export function isAncestor(doc: ComponentDoc, ancestor: NodeId, id: NodeId): boolean {
  let cur: NodeId | null = id;
  while (cur) {
    if (cur === ancestor) return true;
    cur = doc.nodes[cur]?.parentId ?? null;
  }
  return false;
}

export function slotOf(doc: ComponentDoc, id: NodeId): { parentId: NodeId; slot: string; index: number } | null {
  const n = doc.nodes[id];
  if (!n?.parentId) return null;
  const p = doc.nodes[n.parentId];
  for (const [slot, ids] of Object.entries(p.slots)) {
    const index = ids.indexOf(id);
    if (index >= 0) return { parentId: p.id, slot, index };
  }
  return null;
}

export function canDrop(doc: ComponentDoc, brickId: string, parentId: NodeId, slot: string, movingId?: NodeId): boolean {
  const parent = doc.nodes[parentId];
  if (!parent) return false;
  const pb = findBrick(parent.brick);
  const slotDef = pb?.slots?.[slot];
  if (!slotDef) return false;
  if (movingId && isAncestor(doc, movingId, parentId)) return false;
  const current = (parent.slots[slot] ?? []).filter((id) => id !== movingId);
  if (slotDef.max !== undefined && current.length >= slotDef.max) return false;
  const b = findBrick(brickId);
  if (!b) return false;
  if (slotDef.accepts === "inline" && (isContainer(b) || b.state?.kind === "open")) return false;
  return true;
}

export function insertNode(doc: ComponentDoc, node: Node, parentId: NodeId, slot: string, index: number) {
  const parent = doc.nodes[parentId];
  doc.nodes[node.id] = node;
  node.parentId = parentId;
  const list = (parent.slots[slot] ??= []);
  list.splice(Math.max(0, Math.min(index, list.length)), 0, node.id);
}

export function detachNode(doc: ComponentDoc, id: NodeId) {
  const loc = slotOf(doc, id);
  if (!loc) return;
  doc.nodes[loc.parentId].slots[loc.slot].splice(loc.index, 1);
  doc.nodes[id].parentId = null;
}

export function moveNode(doc: ComponentDoc, id: NodeId, parentId: NodeId, slot: string, index: number) {
  const loc = slotOf(doc, id);
  if (!loc) return;
  // Ajuste l'index quand on déplace dans le même slot vers le bas
  let target = index;
  if (loc.parentId === parentId && loc.slot === slot && loc.index < index) target--;
  detachNode(doc, id);
  const parent = doc.nodes[parentId];
  const list = (parent.slots[slot] ??= []);
  list.splice(Math.max(0, Math.min(target, list.length)), 0, id);
  doc.nodes[id].parentId = parentId;
}

export function removeNode(doc: ComponentDoc, id: NodeId) {
  if (id === doc.rootId) return;
  const removed: NodeId[] = [];
  walk(doc, (n) => removed.push(n.id), id);
  detachNode(doc, id);
  for (const r of removed) delete doc.nodes[r];
  const gone = new Set(removed);
  for (const n of Object.values(doc.nodes)) {
    n.interactions = n.interactions.filter((i) => !("target" in i.action) || !gone.has(i.action.target));
  }
  doc.exposedProps = doc.exposedProps.filter((e) => !gone.has(e.nodeId));
}

/** Duplique un nœud et ses descendants, insère la copie juste après l'original */
export function duplicateNode(doc: ComponentDoc, id: NodeId): NodeId | null {
  const loc = slotOf(doc, id);
  if (!loc) return null;
  const map = new Map<NodeId, NodeId>();
  const clone = (srcId: NodeId, parentId: NodeId): NodeId => {
    const src = doc.nodes[srcId];
    const brick = getBrick(src.brick);
    const newId = nextNodeId(doc, brick.short);
    map.set(srcId, newId);
    const copy: Node = structuredClone(src);
    copy.id = newId;
    copy.parentId = parentId;
    copy.name = srcId === id ? `${src.name} (copy)` : src.name;
    doc.nodes[newId] = copy;
    for (const [k, t] of Object.entries(copy.texts)) {
      t.propName = uniquePropName(doc, t.propName, { nodeId: newId, key: k });
    }
    for (const [slot, ids] of Object.entries(src.slots)) copy.slots[slot] = ids.map((c) => clone(c, newId));
    return newId;
  };
  const newId = clone(id, loc.parentId);
  doc.nodes[loc.parentId].slots[loc.slot].splice(loc.index + 1, 0, newId);
  // Props exposées des nœuds copiés (ex. raccourci d'une palette) : dupliquées avec un nom unique
  for (const [src, dst] of map) {
    for (const e of doc.exposedProps.filter((x) => x.nodeId === src)) {
      doc.exposedProps.push({ nodeId: dst, prop: e.prop, propName: uniquePropName(doc, e.propName) });
    }
  }
  // Les interactions internes à la copie pointent vers les copies
  for (const nid of map.values()) {
    for (const i of doc.nodes[nid].interactions) {
      if ("target" in i.action && map.has(i.action.target)) i.action.target = map.get(i.action.target)!;
    }
  }
  return newId;
}

/** Corrige les incohérences (après un parsing ou une édition JSON) */
/** Briques renommées ou remplacées (documents enregistrés avec une version antérieure) */
const BRICK_MIGRATIONS: Record<string, string> = { "vaul.drawer": "baseui.drawer" };

export function normalizeDoc(doc: ComponentDoc) {
  for (const n of Object.values(doc.nodes)) {
    if (BRICK_MIGRATIONS[n.brick]) n.brick = BRICK_MIGRATIONS[n.brick];
    // ancienne prop « hotkey » (lettre seule) des palettes cmdk → « shortcut »
    if (typeof n.props.hotkey === "string") {
      n.props.shortcut = `mod+${n.props.hotkey}`;
      delete n.props.hotkey;
    }
    const brick = findBrick(n.brick);
    if (!brick) continue;
    for (const s of Object.keys(brick.slots ?? {})) n.slots[s] ??= [];
    for (const [k, f] of Object.entries(brick.props)) if (n.props[k] === undefined) n.props[k] = f.default;
    for (const k of Object.keys(n.props)) if (!(k in brick.props)) delete n.props[k];
    n.style ??= { base: {} };
    n.style.base ??= {};
    n.interactions ??= [];
    n.texts ??= {};
  }
  for (const n of Object.values(doc.nodes)) {
    for (const ids of Object.values(n.slots)) for (const c of ids) if (doc.nodes[c]) doc.nodes[c].parentId = n.id;
  }
  doc.exposedProps ??= [];
}
