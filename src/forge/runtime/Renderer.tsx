"use client";
/**
 * Interprète le modèle JSON avec les gabarits des briques et les vrais composants.
 *  - mode "edit"  : canvas du studio (overlays affichés en ligne, attributs de sélection, slots déposables)
 *  - mode "live"  : preview interactive (le drawer s'ouvre, ⌘K répond, les chiffres s'animent)
 *  - mode "export": instantané statique pour l'export HTML/CSS/JS — overlays rendus en ligne et
 *                   marqués (data-fx-*) pour le petit runtime JavaScript sans dépendance (export/vanilla)
 */
import { tr } from "@/i18n/core";
import * as React from "react";
import { findBrick, RAW_BRICK_ID } from "../bricks/registry";
import type { AttrSrc, BrickDefinition, TplEl, TplNode } from "../bricks/types";
import type { ComponentDoc, InteractionAction, Node, NodeId, StyleState } from "../model/types";
import { generateCss, nodeClass, scopeClass } from "../codegen/css";
import { resolveTag } from "./components";
import { matchesShortcut } from "./shortcut";
import { compileClasses } from "./tailwind-runtime";
import { VIEWPORT_WIDTHS } from "./viewport";

export type RenderMode = "edit" | "live" | "export";

type RuntimeValue = boolean | number;
type Ctx = {
  doc: ComponentDoc;
  mode: RenderMode;
  scheme: "light" | "dark";
  selectedId: NodeId | null;
  forceState: StyleState | null;
  showHiddenSlots: boolean;
  state: Record<NodeId, RuntimeValue>;
  setState: (id: NodeId, v: RuntimeValue | ((prev: RuntimeValue) => RuntimeValue)) => void;
  onNavigate?: (href: string, newTab?: boolean) => void;
  inputRefs: Map<NodeId, React.RefObject<HTMLInputElement | null>>;
};
const RenderCtx = React.createContext<Ctx | null>(null);

function initialRuntimeState(doc: ComponentDoc, mode: RenderMode): Record<NodeId, RuntimeValue> {
  const out: Record<NodeId, RuntimeValue> = {};
  for (const n of Object.values(doc.nodes)) {
    const b = findBrick(n.brick);
    if (!b?.state) continue;
    if (b.state.kind === "open") out[n.id] = mode !== "live" ? true : n.props[b.state.initialProp] === true;
    else {
      const animate = mode === "live" && b.effect?.kind === "animateValue" && n.props.animateOnMount === true && b.state.fromProp;
      out[n.id] = Number(animate ? n.props[b.state.fromProp!] : n.props[b.state.initialProp]) || 0;
    }
  }
  return out;
}

/** Configuration des raccourcis : relance l'effet quand elle change */
function effectsKey(doc: ComponentDoc) {
  return Object.values(doc.nodes)
    .map((n) => {
      const b = findBrick(n.brick);
      return b?.effect?.kind === "hotkey" ? `${n.id}:${String(n.props[b.effect.shortcutProp])}:${String(n.props[b.effect.enableProp])}` : "";
    })
    .join("|");
}

function stateKey(doc: ComponentDoc) {
  return Object.values(doc.nodes)
    .map((n) => {
      const b = findBrick(n.brick);
      if (!b?.state) return "";
      return `${n.id}:${String(n.props[b.state.initialProp])}:${b.state.kind === "value" ? `${n.props[b.state.fromProp ?? ""]}:${n.props.animateOnMount}` : ""}`;
    })
    .join("|");
}

export type RendererProps = {
  doc: ComponentDoc;
  mode: RenderMode;
  scheme: "light" | "dark";
  selectedId?: NodeId | null;
  forceState?: StyleState | null;
  showHiddenSlots?: boolean;
  onNavigate?: (href: string, newTab?: boolean) => void;
  /** Incrémenter pour rejouer les animations / réinitialiser l'état */
  replayKey?: number;
  /** Largeur simulée (canvas d'édition) ou "media" (iframe) pour les surcharges par breakpoint */
  breakpoints?: number | "media";
};

export function ComponentRenderer(props: RendererProps) {
  const key = `${stateKey(props.doc)}#${props.replayKey ?? 0}#${props.mode}`;
  return <RendererInner key={key} {...props} />;
}

function RendererInner({ doc, mode, scheme, selectedId = null, forceState = null, showHiddenSlots = false, onNavigate, breakpoints = VIEWPORT_WIDTHS.desktop }: RendererProps) {
  const [state, setStateMap] = React.useState(() => initialRuntimeState(doc, mode));
  const css = React.useMemo(() => generateCss(doc, { studio: true, breakpoints }), [doc, breakpoints]);
  const [inputRefs] = React.useState(() => new Map<NodeId, React.RefObject<HTMLInputElement | null>>());

  // Classes Tailwind saisies à la main : compilées à la volée pour être visibles sur le canvas
  const rawClasses = React.useMemo(
    () => Object.values(doc.nodes).flatMap((n) => (n.className ?? "").split(/\s+/).filter(Boolean)),
    [doc],
  );
  const [rawCss, setRawCss] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    compileClasses(rawClasses).then((c) => alive && setRawCss(c));
    return () => {
      alive = false;
    };
  }, [rawClasses]);
  const setState = React.useCallback<Ctx["setState"]>((id, v) => {
    setStateMap((s) => ({ ...s, [id]: typeof v === "function" ? v(s[id]) : v }));
  }, []);

  // Effets (raccourcis clavier, animation de valeur au montage) — uniquement en mode interactif
  const fxKey = effectsKey(doc);
  const docRef = React.useRef(doc);
  React.useLayoutEffect(() => {
    docRef.current = doc;
  });
  React.useEffect(() => {
    if (mode !== "live") return;
    const timers: number[] = [];
    const listeners: ((e: KeyboardEvent) => void)[] = [];
    for (const n of Object.values(docRef.current.nodes)) {
      const b = findBrick(n.brick);
      if (!b?.effect) continue;
      if (b.effect.kind === "hotkey") {
        const eff = b.effect;
        if (n.props[eff.enableProp] === false) continue;
        const shortcut = String(n.props[eff.shortcutProp] ?? "mod+k");
        const fn = (e: KeyboardEvent) => {
          if (!matchesShortcut(e, shortcut)) return;
          e.preventDefault();
          if (eff.action === "toggle") setState(n.id, (v) => !v);
          else inputRefs.get(n.id)?.current?.focus();
        };
        document.addEventListener("keydown", fn);
        listeners.push(fn);
      }
      if (b.effect.kind === "animateValue" && b.state && n.props.animateOnMount === true) {
        const target = Number(n.props[b.state.initialProp]) || 0;
        timers.push(window.setTimeout(() => setState(n.id, target), b.effect.delayMs));
      }
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      listeners.forEach((fn) => document.removeEventListener("keydown", fn));
    };
  }, [mode, setState, inputRefs, fxKey]);

  const ctx: Ctx = { doc, mode, scheme, selectedId, forceState, showHiddenSlots, state, setState, onNavigate, inputRefs };
  return (
    <RenderCtx.Provider value={ctx}>
      <style data-forge-css>{css}</style>
      {rawCss && <style data-forge-raw-classes>{rawCss}</style>}
      <NodeView id={doc.rootId} />
    </RenderCtx.Provider>
  );
}

class NodeBoundary extends React.Component<{ name: string; children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error)
      return (
        <div className="forge-node-error">
          {this.props.name} : {this.state.error}
        </div>
      );
    return this.props.children;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlotProps = Record<string, any>;

function NodeView({ id, ...slotProps }: { id: NodeId } & SlotProps) {
  const ctx = React.useContext(RenderCtx)!;
  const node = ctx.doc.nodes[id];
  if (!node) return null;
  if (node.brick === RAW_BRICK_ID) {
    return (
      <div className="forge-raw" data-forge-id={ctx.mode === "edit" ? node.id : undefined} title={String(node.props.code)}>
        {tr("Unrecognized code — kept as is on export")}
      </div>
    );
  }
  const brick = findBrick(node.brick);
  if (!brick) return <div className="forge-node-error">Brique inconnue : {node.brick}</div>;
  const tpl = ctx.mode !== "live" && brick.editTpl ? brick.editTpl : brick.tpl;
  return <NodeBoundary name={node.name}>{renderEl(ctx, tpl, node, brick, "r", slotProps)}</NodeBoundary>;
}

function runActions(ctx: Ctx, actions: InteractionAction[]) {
  for (const a of actions) {
    if (a.type === "custom") continue; // code libre : exécuté seulement dans le composant exporté
    if (a.type === "navigate") ctx.onNavigate?.(a.href, a.newTab);
    else if (a.type === "open") ctx.setState(a.target, true);
    else if (a.type === "close") ctx.setState(a.target, false);
    else if (a.type === "toggle") ctx.setState(a.target, (v) => !v);
    else if (a.type === "setValue") ctx.setState(a.target, a.value);
  }
}

function attrRuntime(ctx: Ctx, src: AttrSrc, node: Node, brick: BrickDefinition): unknown {
  if ("lit" in src) return src.lit;
  if ("prop" in src) {
    if ("mapObj" in src) {
      const v = src.mapObj[String(node.props[src.prop])];
      return v === null || v === false ? undefined : v;
    }
    return node.props[src.prop];
  }
  if ("text" in src) return node.texts[src.text]?.value as string;
  if ("state" in src) {
    if (src.state === "value") return ctx.state[node.id];
    return (v: RuntimeValue) => {
      if (ctx.mode === "live") ctx.setState(node.id, v);
    };
  }
  if ("openState" in src) return ctx.mode === "live" ? () => ctx.setState(node.id, true) : undefined;
  if ("inputRef" in src) {
    if (!ctx.inputRefs.has(node.id)) ctx.inputRefs.set(node.id, React.createRef<HTMLInputElement>());
    return ctx.inputRefs.get(node.id);
  }
  if ("onClick" in src) {
    if (ctx.mode !== "live" || !node.interactions.length) return undefined;
    return () => runActions(ctx, node.interactions.map((i) => i.action));
  }
  void brick;
  return undefined;
}

function hostedSlot(el: TplEl): string | null {
  for (const c of el.children ?? []) if ("slot" in c) return c.slot;
  return null;
}

function joinClasses(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function renderEl(ctx: Ctx, el: TplEl, node: Node, brick: BrickDefinition, key: string, slotProps?: SlotProps, item?: string): React.ReactNode {
  const tagName = typeof el.el === "string" ? el.el : (el.el.map[String(node.props[el.el.prop])] ?? Object.values(el.el.map)[0]);
  // Export : la légende d'aperçu d'édition disparaît, NumberFlow devient un texte formaté (animé par le runtime)
  if (ctx.mode === "export" && el.classes?.includes("forge-edit-caption")) return null;
  if (ctx.mode === "export" && tagName === "NumberFlow") return exportNumber(ctx, el, node, brick, key);
  const Tag = resolveTag(tagName);
  if (!Tag) return <div key={key} className="forge-node-error">Composant introuvable : {tagName}</div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};
  const isScope = !!el.scope || (node.id === ctx.doc.rootId && !!el.styled);
  const classProps = Object.entries(el.classProps ?? {}).map(([p, map]) => map[String(node.props[p])]);
  const cls = joinClasses(
    isScope && scopeClass(ctx.doc),
    isScope && ctx.scheme === "dark" && "dark",
    el.styled && nodeClass(ctx.doc, node.id),
    el.classes,
    ...classProps,
    el.styled && node.className,
  );
  if (cls) props[el.classAttr ?? "className"] = cls;

  for (const [name, src] of Object.entries(el.attrs ?? {})) {
    const v = attrRuntime(ctx, src, node, brick);
    if (v !== undefined) props[name] = v;
  }

  // Attributs saisis à la main : seules les valeurs littérales sont appliquées dans le studio
  if (el.styled) {
    for (const [name, v] of Object.entries(node.extraAttrs ?? {})) {
      if (v === "") props[name] = true;
      else if (/^"[^"]*"$/.test(v)) props[name] = v.slice(1, -1);
    }
  }

  if (ctx.mode === "export") {
    if (key === "r") {
      props["data-fx-node"] = node.id;
      props["data-fx-brick"] = brick.id;
    }
    const textAttrs: string[] = [];
    for (const [name, src] of Object.entries(el.attrs ?? {})) {
      if ("onClick" in src && node.interactions.length) props["data-fx-click"] = node.id;
      if ("openState" in src) props["data-fx-open"] = node.id;
      if ("text" in src && node.texts[src.text]?.expose) textAttrs.push(`${name}=${node.id}:${src.text}`);
    }
    if (textAttrs.length) props["data-fx-attrs"] = textAttrs.join(";");
    // Texte exposé en prop, seul enfant de l'élément : l'élément porte le marqueur (le runtime remplace son contenu)
    const only = el.children?.length === 1 ? el.children[0] : null;
    if (only && "text" in only && node.texts[only.text]?.expose) props["data-fx-text"] = `${node.id}:${only.text}`;
  }

  if (ctx.mode === "edit") {
    if (el.styled) {
      props["data-forge-id"] = node.id;
      if (ctx.forceState && ctx.selectedId === node.id) props["data-forge-state"] = ctx.forceState;
    }
    const slot = hostedSlot(el);
    if (slot) props["data-forge-slot"] = `${node.id}:${slot}`;
  }

  // Props injectées par un parent asChild (Drawer.Trigger, DialogTrigger…) sur l'élément racine
  if (slotProps && Object.keys(slotProps).length) {
    for (const [k, v] of Object.entries(slotProps)) {
      if (k === "className") props.className = joinClasses(props.className, v);
      else if (k === "onClick" && typeof props.onClick === "function") {
        const own = props.onClick;
        props.onClick = (e: unknown) => {
          v?.(e);
          own(e);
        };
      } else props[k] = v;
    }
  }

  const marked = "data-fx-text" in props;
  const children = (el.children ?? []).flatMap((c, i) => renderTpl(ctx, c, node, brick, `${key}.${i}`, item, marked));
  delete props.key;
  if (children.length === 0) return <Tag key={key} {...props} />;
  return (
    <Tag key={key} {...props}>
      {children.length === 1 ? children[0] : children}
    </Tag>
  );
}

function exportNumber(ctx: Ctx, el: TplEl, node: Node, brick: BrickDefinition, key: string): React.ReactNode {
  const a: Record<string, unknown> = {};
  for (const [name, src] of Object.entries(el.attrs ?? {})) a[name] = attrRuntime(ctx, src, node, brick);
  const value = Number(a.value) || 0;
  let text = String(value);
  try {
    text = new Intl.NumberFormat(String(a.locales ?? "fr-FR"), (a.format as Intl.NumberFormatOptions) ?? undefined).format(value);
  } catch {
    /* format invalide : valeur brute */
  }
  return (
    <span key={key} data-fx-number={node.id}>
      {`${a.prefix ?? ""}${text}${a.suffix ?? ""}`}
    </span>
  );
}

/** Export : ajoute un attribut data-fx-* à un élément rendu (listes, blocs conditionnels exposés) */
function mark(n: React.ReactNode, attrs: Record<string, string | boolean>): React.ReactNode {
  return React.isValidElement(n) ? React.cloneElement(n as React.ReactElement<Record<string, unknown>>, attrs) : n;
}

function renderTpl(ctx: Ctx, t: TplNode, node: Node, brick: BrickDefinition, key: string, item?: string, parentMarked = false): React.ReactNode[] {
  if ("text" in t) {
    const v = node.texts[t.text]?.value;
    const str = v === undefined ? "" : String(v);
    // Texte exposé à côté d'autres enfants : enveloppe neutre (display: contents) pour que le runtime le retrouve
    if (ctx.mode === "export" && !parentMarked && node.texts[t.text]?.expose)
      return [
        <span key={key} data-fx-text={`${node.id}:${t.text}`} style={{ display: "contents" }}>
          {str}
        </span>,
      ];
    return str === "" ? [] : [str];
  }
  if ("staticText" in t) return ctx.mode === "edit" ? [tr(t.staticText)] : [];
  if ("itemText" in t) return [item ?? ""];
  if ("slot" in t) {
    const ids = node.slots[t.slot] ?? [];
    if (!ids.length && ctx.mode === "edit") {
      const label = tr(brick.slots?.[t.slot]?.label ?? t.slot);
      return [
        <div key={key} className="forge-empty-slot" data-forge-empty={`${node.id}:${t.slot}`}>
          {label}
        </div>,
      ];
    }
    return ids.map((cid) => <NodeView key={cid} id={cid} />);
  }
  if ("list" in t) {
    const v = node.texts[t.list]?.value;
    const items = Array.isArray(v) ? v : v ? [v] : [];
    const exposed = ctx.mode === "export" && node.texts[t.list]?.expose;
    return items.map((it, i) => {
      const r = renderEl(ctx, t.item, node, brick, `${key}.${i}`, undefined, it);
      return exposed ? mark(r, { "data-fx-item": `${node.id}:${t.list}` }) : r;
    });
  }
  if ("ifProp" in t) return node.props[t.ifProp] ? t.then.flatMap((c, i) => renderTpl(ctx, c, node, brick, `${key}.${i}`, item)) : [];
  if ("ifText" in t) {
    const has = !!node.texts[t.ifText]?.value;
    // Export : texte exposé → toujours rendu, masqué s'il est vide (le runtime l'affiche si la prop est renseignée)
    if (ctx.mode === "export" && node.texts[t.ifText]?.expose)
      return t.then.flatMap((c, i) => renderTpl(ctx, c, node, brick, `${key}.${i}`, item)).map((r) => mark(r, { "data-fx-if": `${node.id}:${t.ifText}`, hidden: !has }));
    return has ? t.then.flatMap((c, i) => renderTpl(ctx, c, node, brick, `${key}.${i}`, item)) : [];
  }
  if ("ifSlot" in t) {
    const has = (node.slots[t.ifSlot] ?? []).length > 0;
    const show = has || (ctx.mode === "edit" && (ctx.selectedId === node.id || ctx.showHiddenSlots));
    return show ? t.then.flatMap((c, i) => renderTpl(ctx, c, node, brick, `${key}.${i}`, item)) : [];
  }
  return [renderEl(ctx, t, node, brick, key, undefined, item)];
}
