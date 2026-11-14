"use client";
import * as React from "react";
import { findBrick } from "@/forge/bricks/registry";
import type { Node, StyleKey, StyleValue } from "@/forge/model/types";
import { STYLE_TOKEN_GROUP, tokensOfGroup, tokenValue } from "@/forge/tokens/theme";
import { useSelectedNode, useStudio } from "@/forge/store/studio";
import { BREAKPOINTS, type Breakpoint } from "@/forge/model/types";
import { VIEWPORT_LAYER } from "@/forge/runtime/viewport";
import { Button } from "@/components/ui/button";
import { ColorInput, ColorSwatch, EmptyState, Field, Section, Segmented, SelectInput, SliderInput, BufferedInput } from "./controls";
import { NodeHeader } from "./BehaviorPanel";
import { StatePicker } from "./StatePicker";
import { useT } from "@/i18n/react";

const LABELS: Record<StyleKey, string> = {
  bg: "Background",
  fg: "Text",
  borderColor: "Border",
  borderWidth: "Thickness",
  radius: "Radius",
  shadow: "Shadow",
  px: "Horiz. padding",
  py: "Vert. padding",
  mt: "Top margin",
  mb: "Bottom margin",
  gap: "Gap",
  width: "Width",
  maxWidth: "Max width",
  minHeight: "Min height",
  fontFamily: "Font",
  fontSize: "Size",
  fontWeight: "Weight",
  lineHeight: "Line height",
  textAlign: "Alignment",
  opacity: "Opacity",
};

const GROUPS: { title: string; keys: StyleKey[] }[] = [
  { title: "Colors", keys: ["bg", "fg", "borderColor"] },
  { title: "Border, radius, shadow", keys: ["borderWidth", "radius", "shadow"] },
  { title: "Spacing", keys: ["px", "py", "gap", "mt", "mb"] },
  { title: "Dimensions", keys: ["width", "maxWidth", "minHeight"] },
  { title: "Typography", keys: ["fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign"] },
  { title: "Opacity", keys: ["opacity"] },
];

const CUSTOM = "__custom";

function useSetStyle(node: Node) {
  const update = useStudio((s) => s.update);
  const forceState = useStudio((s) => s.forceState);
  const viewport = useStudio((s) => s.viewport);
  const layer = forceState ?? VIEWPORT_LAYER[viewport];
  return {
    layer,
    value: (key: StyleKey) => node.style[layer]?.[key],
    /** Breakpoint où la valeur est surchargée (badge), si on édite un breakpoint */
    overridden: (key: StyleKey) => (BREAKPOINTS.includes(layer as Breakpoint) && node.style[layer]?.[key] ? layer : undefined),
    set: (key: StyleKey, v: StyleValue | undefined) =>
      update(
        (d) => {
          const n = d.nodes[node.id];
          const decl = (n.style[layer] ??= {});
          if (v) decl[key] = v;
          else delete decl[key];
          if (layer !== "base" && !Object.keys(decl).length) delete n.style[layer];
        },
        { coalesce: `style:${node.id}:${layer}:${key}` },
      ),
  };
}

function TokenSlider({ tokens, value, onChange }: { tokens: [string, string][]; value: StyleValue | undefined; onChange: (v: StyleValue) => void }) {
  const idx = value && "token" in value ? Math.max(0, tokens.findIndex(([t]) => t === value.token)) : 0;
  return <SliderInput value={idx} min={0} max={tokens.length - 1} step={1} onChange={(i) => onChange({ token: tokens[i][0] })} format={(i) => (value ? (tokens[i]?.[1].split(" · ")[1] ?? "") : "—")} />;
}

function StyleControl({ node, k }: { node: Node; k: StyleKey }) {
  const t = useT();
  const doc = useStudio((s) => s.doc)!;
  const scheme = useStudio((s) => s.scheme);
  const { value, set, overridden } = useSetStyle(node);
  const v = value(k);
  const badge = overridden(k);
  const group = STYLE_TOKEN_GROUP[k];
  const reset = v ? () => set(k, undefined) : undefined;
  const label = t(LABELS[k]);

  if (k === "fontWeight") {
    const opts = ["300", "400", "500", "600", "700", "800"].map((w) => ({ value: w, label: t({ "300": "Light", "400": "Regular", "500": "Medium", "600": "Semibold", "700": "Bold", "800": "Extra bold" }[w]!) + ` · ${w}` }));
    return (
      <Field label={label} onReset={reset} badge={badge}>
        <SelectInput value={v && "value" in v ? v.value : undefined} onChange={(x) => set(k, { value: x })} options={opts} placeholder={t("Inherited")} />
      </Field>
    );
  }
  if (k === "lineHeight")
    return (
      <Field label={label} onReset={reset} badge={badge}>
        <SliderInput value={v && "value" in v ? Number(v.value) || 1.5 : 1.5} min={0.9} max={2.2} step={0.05} onChange={(x) => set(k, { value: String(Math.round(x * 100) / 100) })} format={(x) => (v ? x.toFixed(2) : t("inherited"))} />
      </Field>
    );
  if (k === "opacity")
    return (
      <Field label={label} onReset={reset} badge={badge}>
        <SliderInput value={v && "value" in v ? Number(v.value) : 1} min={0} max={1} step={0.05} onChange={(x) => set(k, { value: String(x) })} format={(x) => `${Math.round(x * 100)}%`} />
      </Field>
    );
  if (k === "borderWidth")
    return (
      <Field label={label} onReset={reset} badge={badge}>
        <SliderInput value={v && "value" in v ? parseFloat(v.value) || 0 : 0} min={0} max={8} step={1} onChange={(x) => set(k, { value: `${x}px` })} format={(x) => `${x}px`} />
      </Field>
    );
  if (k === "textAlign")
    return (
      <Field label={label} onReset={reset} badge={badge}>
        <Segmented ariaLabel={label} value={v && "value" in v ? v.value : ""} onChange={(x) => set(k, { value: x })} options={[{ value: "left", label: t("Left") }, { value: "center", label: t("Center") }, { value: "right", label: t("Right") }]} />
      </Field>
    );
  if (!group) {
    const presets = k === "width" ? ["auto", "100%", "fit-content", "20rem", "24rem"] : k === "maxWidth" ? ["none", "20rem", "28rem", "36rem", "48rem", "64rem"] : ["auto", "4rem", "10rem", "20rem", "100vh"];
    return (
      <Field label={label} onReset={reset} badge={badge}>
        <div className="flex gap-1">
          <BufferedInput value={v && "value" in v ? v.value : ""} onCommit={(x) => set(k, x.trim() ? { value: x.trim() } : undefined)} placeholder="auto" className="font-mono" />
          <SelectInput value={undefined} onChange={(x) => set(k, { value: x })} options={presets.map((p) => ({ value: p, label: p }))} placeholder="…" />
        </div>
      </Field>
    );
  }

  const tokens = tokensOfGroup(doc.theme, group);
  const isCustom = !!v && "value" in v;
  const selectValue = v ? ("token" in v ? v.token : CUSTOM) : undefined;
  const options = [...tokens.map(([value, l]) => ({ value, label: t(l) })), { value: CUSTOM, label: t("Custom value…") }];
  const defaultCustom = () => {
    if (group === "color") return "#2563eb";
    if (group === "radius") return "8px";
    if (group === "space") return "12px";
    if (group === "shadow") return "0 2px 8px rgb(0 0 0 / 0.12)";
    if (group === "font") return "Georgia, serif";
    return "1rem";
  };
  return (
    <Field label={label} onReset={reset} badge={badge}>
      <div className={group === "space" && !isCustom ? "grid grid-cols-[1fr_88px] items-center gap-2" : "flex flex-col gap-1.5"}>
        {group === "space" && !isCustom && <TokenSlider tokens={tokens} value={v} onChange={(x) => set(k, x)} />}
        <SelectInput
          value={selectValue}
          placeholder={t("Inherited")}
          onChange={(x) => set(k, x === CUSTOM ? { value: v && "token" in v ? (tokenValue(doc.theme, v.token, scheme) ?? defaultCustom()) : defaultCustom() } : { token: x })}
          options={options}
          renderOption={
            group === "color"
              ? (o) => (
                  <span className="flex items-center gap-2">
                    {o.value !== CUSTOM && <ColorSwatch color={tokenValue(doc.theme, o.value, scheme) ?? "transparent"} />}
                    {o.label}
                  </span>
                )
              : undefined
          }
        />
        {isCustom &&
          (group === "color" ? (
            <ColorInput value={(v as { value: string }).value} onChange={(x) => set(k, { value: x })} ariaLabel={label} />
          ) : group === "radius" ? (
            <SliderInput value={parseFloat((v as { value: string }).value) || 0} min={0} max={48} step={1} onChange={(x) => set(k, { value: `${x}px` })} format={(x) => `${x}px`} />
          ) : group === "space" ? (
            <SliderInput value={parseFloat((v as { value: string }).value) || 0} min={0} max={96} step={1} onChange={(x) => set(k, { value: `${x}px` })} format={(x) => `${x}px`} />
          ) : (
            <BufferedInput value={(v as { value: string }).value} onCommit={(x) => set(k, { value: x })} className="font-mono" />
          ))}
        {group === "color" && isCustom && <p className="text-[11px] text-muted-foreground">{t("Fixed value: use a token to follow dark mode.")}</p>}
      </div>
    </Field>
  );
}

const VIEWPORT_LABEL = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop" } as const;

/** Breakpoint édité (déduit du viewport) + surcharges présentes et réinitialisation */
function BreakpointBar({ node }: { node: Node }) {
  const t = useT();
  const viewport = useStudio((s) => s.viewport);
  const update = useStudio((s) => s.update);
  const layer = VIEWPORT_LAYER[viewport];
  const overrides = BREAKPOINTS.filter((bp) => node.style[bp] && Object.keys(node.style[bp]!).length);
  return (
    <div className="flex flex-col gap-1.5 border-b px-3 py-2 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span>
          {t("Edited breakpoint:")} <strong className="text-foreground">{t(VIEWPORT_LABEL[viewport])}</strong> ·{" "}
          <span className="font-mono">{layer === "base" ? t("base (all screens)") : `${layer}: (≥ ${layer === "md" ? "768" : "1024"} px)`}</span>
        </span>
        {layer !== "base" && node.style[layer] && (
          <Button variant="ghost" size="xs" className="ml-auto" onClick={() => update((d) => void delete d.nodes[node.id].style[layer as Breakpoint])}>
            {t("Reset {name}", { name: layer })}
          </Button>
        )}
      </div>
      {overrides.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {t("Overrides:")}
          {overrides.map((bp) => (
            <span key={bp} className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              {bp} · {Object.keys(node.style[bp]!).length}
            </span>
          ))}
        </div>
      )}
      {layer !== "base" && <span>{t("Switch viewport (top bar) to edit another breakpoint; mobile = base.")}</span>}
    </div>
  );
}

/** Classes Tailwind, expressions et attributs saisis dans le code, hors panneaux */
function RawClassesSection({ node }: { node: Node }) {
  const t = useT();
  const update = useStudio((s) => s.update);
  const extra = Object.entries(node.extraAttrs ?? {});
  return (
    <Section title={t("Outside panels")} defaultOpen={!!(node.className || node.classNameExpr || extra.length)}>
      <Field label={t("Classes")} hint={t("Tailwind classes merged with cn(): they win over generated classes on conflict")}>
        <BufferedInput
          value={node.className ?? ""}
          onCommit={(v) =>
            update(
              (d) => {
                const n = d.nodes[node.id];
                if (v.trim()) n.className = v;
                else delete n.className;
              },
              { coalesce: `raw:${node.id}` },
            )
          }
          placeholder={t("e.g. ring-2 ring-offset-2")}
          className="font-mono"
        />
      </Field>
      {node.classNameExpr && (
        <Field label={t("Expression")}>
          <code className="block rounded bg-muted px-1.5 py-1 font-mono text-[11px]">{node.classNameExpr}</code>
        </Field>
      )}
      {extra.map(([k, v]) => (
        <Field key={k} label={k}>
          <code className="block rounded bg-muted px-1.5 py-1 font-mono text-[11px]">{v || t("(bare attribute)")}</code>
        </Field>
      ))}
      <p className="text-[11px] text-muted-foreground">{t("Kept as is on export. Expressions and attributes are edited in the Code tab.")}</p>
    </Section>
  );
}

export function StylePanel() {
  const t = useT();
  const node = useSelectedNode();
  const forceState = useStudio((s) => s.forceState);
  if (!node) return <EmptyState>{t("Select an element to style.")}</EmptyState>;
  const brick = findBrick(node.brick);
  if (!brick || !brick.styleTargets.length) return <EmptyState>{t("This element has no style settings.")}</EmptyState>;
  return (
    <div>
      <NodeHeader node={node} />
      <StatePicker node={node} />
      {forceState ? (
        <p className="border-b bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          {t("You are editing the {state} state: only the values changed here apply to this state.", { state: forceState })}
        </p>
      ) : (
        <BreakpointBar node={node} />
      )}
      {GROUPS.map((g) => {
        const keys = g.keys.filter((k) => brick.styleTargets.includes(k));
        if (!keys.length) return null;
        return (
          <Section key={g.title} title={t(g.title)}>
            {keys.map((k) => (
              <StyleControl key={k} node={node} k={k} />
            ))}
          </Section>
        );
      })}
      <RawClassesSection node={node} />
      <p className="px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
        {t("Each setting becomes a CSS variable of the node (--{id}-…) that points to a theme token or to your value.", { id: node.id })}
      </p>
    </div>
  );
}
