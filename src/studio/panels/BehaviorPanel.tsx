"use client";
import * as React from "react";
import { ExternalLink, Play, Plus, Trash2, TriangleAlert } from "lucide-react";
import { formatShortcut, isValidShortcut } from "@/forge/runtime/shortcut";
import { shortcutConflicts, suggestShortcut } from "../shortcuts";
import { BEAUTIFUL_UI_EASINGS, BEAUTIFUL_UI_MOTION } from "@/forge/tokens/beautiful-ui";
import { findBrick } from "@/forge/bricks/registry";
import type { PropField } from "@/forge/bricks/types";
import type { AnimationSpec, ComponentDoc, Interaction, InteractionAction, Node } from "@/forge/model/types";
import { ANIMATION_PRESETS } from "@/forge/model/types";
import { uniquePropName, walk } from "@/forge/model/ops";
import { useSelectedNode, useStudio } from "@/forge/store/studio";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BufferedInput, EmptyState, Field, Section, Segmented, SelectInput, SliderInput, TextInput } from "./controls";
import { StatePicker } from "./StatePicker";
import { SvgMarkupField } from "./SvgMarkupField";
import { SVG_BRICK_ID } from "@/forge/bricks/defs/svg";
import { ICON_BRICK_ID } from "@/forge/bricks/defs/icon";
import { IconPicker } from "./IconPicker";
import { translate, translateNodeName, type Locale } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/react";

export function NodeHeader({ node }: { node: Node }) {
  const { locale, t } = useLocale();
  const brick = findBrick(node.brick);
  const rename = useStudio((s) => s.rename);
  return (
    <div className="border-b px-3 py-2.5">
      <BufferedInput value={translateNodeName(locale, node.name)} onCommit={(v) => v.trim() && rename(node.id, v)} aria-label={t("Element name")} className="h-7 border-transparent px-1 text-[13px] font-semibold hover:border-border" />
      {brick && (
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <span>{t(brick.label)}</span>
          <span aria-hidden>·</span>
          {brick.library.url ? (
            <a href={brick.library.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-medium text-foreground hover:underline">
              {t(brick.library.name)}
              <ExternalLink className="size-2.5" />
            </a>
          ) : (
            <span>{t(brick.library.name)}</span>
          )}
          <span className="ml-auto font-mono opacity-70">{node.id}</span>
        </div>
      )}
    </div>
  );
}

function PropControl({ field, value, onChange, id }: { field: PropField; value: unknown; onChange: (v: string | number | boolean) => void; id: string }) {
  const t = useT();
  switch (field.type) {
    case "enum": {
      const options = field.options.map((o) => ({ value: o.value, label: t(o.label) }));
      return options.length <= 4 && options.every((o) => o.label.length <= 9) ? (
        <Segmented ariaLabel={t(field.label)} value={String(value)} onChange={onChange} options={options} />
      ) : (
        <SelectInput id={id} value={String(value)} onChange={onChange} options={options} />
      );
    }
    case "boolean":
      return (
        <div className="flex h-7 items-center">
          <Switch id={id} checked={value === true} onCheckedChange={onChange} />
        </div>
      );
    case "number":
      return field.max - field.min <= 200 ? (
        <SliderInput value={Number(value)} min={field.min} max={field.max} step={field.step} onChange={onChange} />
      ) : (
        <TextInput id={id} type="number" value={Number(value)} step={field.step} onChange={(e) => onChange(Number(e.target.value))} />
      );
    case "string":
      return <BufferedInput id={id} value={String(value ?? "")} onCommit={onChange} />;
  }
}

function PropsSection({ node }: { node: Node }) {
  const t = useT();
  const brick = findBrick(node.brick)!;
  const update = useStudio((s) => s.update);
  const exposed = useStudio((s) => s.doc!.exposedProps);
  const entries = Object.entries(brick.props);
  if (!entries.length) return null;
  return (
    <Section title={`${t("Props")} · ${t(brick.library.name)}`}>
      {entries.map(([key, field]) => {
        const ex = exposed.find((e) => e.nodeId === node.id && e.prop === key);
        if (brick.id === SVG_BRICK_ID && key === "markup")
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={`prop-${key}`} className="text-[12px] text-muted-foreground">
                {t(field.label)}
              </label>
              <SvgMarkupField
                id={`prop-${key}`}
                value={String(node.props[key] ?? "")}
                onChange={(v) =>
                  update((d) => {
                    d.nodes[node.id].props[key] = v;
                  })
                }
              />
              {field.help && <p className="text-[11px] text-muted-foreground">{t(field.help)}</p>}
            </div>
          );
        return (
          <div key={key} className="flex flex-col gap-1">
            <Field label={t(field.label)} hint={field.help && t(field.help)} htmlFor={`prop-${key}`}>
              {brick.id === ICON_BRICK_ID && key === "name" ? (
                <IconPicker
                  id={`prop-${key}`}
                  value={String(node.props[key])}
                  onChange={(v) =>
                    update((d) => {
                      d.nodes[node.id].props[key] = v;
                    })
                  }
                />
              ) : (
              <PropControl
                id={`prop-${key}`}
                field={field}
                value={node.props[key]}
                onChange={(v) =>
                  update(
                    (d) => {
                      d.nodes[node.id].props[key] = v;
                    },
                    { coalesce: `prop:${node.id}:${key}` },
                  )
                }
              />
              )}
            </Field>
            {brick.effect?.kind === "hotkey" && key === brick.effect.shortcutProp && <ShortcutStatus node={node} value={String(node.props[key])} />}
            {"exposable" in field && field.exposable && (
              <div className="ml-[100px] flex items-center gap-2 text-[11px] text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={!!ex}
                    onChange={(e) =>
                      update((d) => {
                        if (e.target.checked) {
                          const hint = `${node.name.split(" ")[0].toLowerCase()}${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                          d.exposedProps.push({ nodeId: node.id, prop: key, propName: uniquePropName(d as ComponentDoc, hint) });
                        } else d.exposedProps = d.exposedProps.filter((x) => !(x.nodeId === node.id && x.prop === key));
                      })
                    }
                  />
                  {t("Component prop")}
                </label>
                {ex && <span className="font-mono text-foreground">{ex.propName}</span>}
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}

function ShortcutStatus({ node, value }: { node: Node; value: string }) {
  const { locale, t } = useLocale();
  const doc = useStudio((s) => s.doc)!;
  const update = useStudio((s) => s.update);
  const brick = findBrick(node.brick);
  if (brick?.effect?.kind !== "hotkey") return null;
  const enabled = node.props[brick.effect.enableProp] !== false;
  const prop = brick.effect.shortcutProp;
  if (!isValidShortcut(value))
    return <p className="ml-[100px] text-[11px] text-destructive">{t("Invalid format. Examples: mod+k, mod+shift+p, alt+/")}</p>;
  const conflicts = enabled ? shortcutConflicts(doc).get(node.id) : undefined;
  if (!conflicts)
    return <p className="ml-[100px] text-[11px] text-muted-foreground">{enabled ? formatShortcut(value) : t("Shortcut disabled")}</p>;
  const suggestion = suggestShortcut(doc, node.id);
  return (
    <div className="ml-[100px] flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900" role="alert">
      <span className="flex items-center gap-1 font-medium">
        <TriangleAlert className="size-3" /> {t("Conflict: {shortcut} is also used by {names}.", { shortcut: formatShortcut(value), names: conflicts.map((c) => translateNodeName(locale, c.name)).join(", ") })}
      </span>
      <Button
        variant="outline"
        size="xs"
        className="self-start"
        onClick={() => update((d) => void (d.nodes[node.id].props[prop] = suggestion))}
      >
        {t("Use {shortcut}", { shortcut: formatShortcut(suggestion) })}
      </Button>
    </div>
  );
}

function statefulTargets(doc: ComponentDoc, kind: "open" | "value", locale: Locale) {
  const out: { value: string; label: string }[] = [];
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    if (b?.state?.kind === kind) out.push({ value: n.id, label: `${translateNodeName(locale, n.name)} (${translate(locale, b.label)})` });
  });
  return out;
}

const ACTION_LABELS: Record<InteractionAction["type"], string> = {
  open: "Open",
  close: "Close",
  toggle: "Toggle",
  setValue: "Change a value",
  navigate: "Navigate",
  custom: "Custom code",
};

function InteractionRow({ node, index, it }: { node: Node; index: number; it: Interaction }) {
  const { locale, t: tt } = useLocale();
  const doc = useStudio((s) => s.doc)!;
  const update = useStudio((s) => s.update);
  const set = (fn: (i: Interaction) => void) =>
    update(
      (d) => {
        fn(d.nodes[node.id].interactions[index]);
      },
      { coalesce: `interaction:${node.id}:${index}` },
    );
  const a = it.action;
  const openTargets = statefulTargets(doc, "open", locale);
  const valueTargets = statefulTargets(doc, "value", locale);
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-muted-foreground">{tt("On click")}</span>
        <div className="flex-1">
          <SelectInput
            value={a.type}
            onChange={(t) =>
              set((i) => {
                const type = t as InteractionAction["type"];
                if (type === "navigate") i.action = { type, href: "/" };
                else if (type === "setValue") i.action = { type, target: valueTargets[0]?.value ?? "", value: 0 };
                else if (type !== "custom") i.action = { type, target: openTargets[0]?.value ?? "" };
              })
            }
            options={Object.entries(ACTION_LABELS)
              .filter(([value]) => value !== "custom" || a.type === "custom")
              .map(([value, label]) => ({ value, label: tt(label) }))}
          />
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:text-destructive"
          aria-label={tt("Delete the interaction")}
          onClick={() => update((d) => void d.nodes[node.id].interactions.splice(index, 1))}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {a.type === "custom" && (
        <div className="flex flex-col gap-1">
          <pre className="overflow-x-auto rounded bg-background p-1.5 font-mono text-[11px]">{a.code}</pre>
          <span className="text-[11px] text-muted-foreground">{tt("Typed in the Code tab: kept as is, editable only in the code.")}</span>
        </div>
      )}
      {(a.type === "open" || a.type === "close" || a.type === "toggle") &&
        (openTargets.length ? (
          <Field label={tt("Element")}>
            <SelectInput value={a.target} onChange={(v) => set((i) => void ("target" in i.action && (i.action.target = v)))} options={openTargets} />
          </Field>
        ) : (
          <p className="text-[11px] text-muted-foreground">{tt("Add a Drawer, Dialog, Popover, Palette or Collapsible section to target.")}</p>
        ))}
      {a.type === "setValue" &&
        (valueTargets.length ? (
          <>
            <Field label={tt("Element")}>
              <SelectInput value={a.target} onChange={(v) => set((i) => void ("target" in i.action && (i.action.target = v)))} options={valueTargets} />
            </Field>
            <Field label={tt("Value")}>
              <TextInput type="number" value={a.value} onChange={(e) => set((i) => void (i.action.type === "setValue" && (i.action.value = Number(e.target.value))))} />
            </Field>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{tt("Add an “Animated number” (NumberFlow) to target.")}</p>
        ))}
      {a.type === "navigate" && (
        <>
          <Field label="URL">
            <BufferedInput value={a.href} onCommit={(v) => set((i) => void (i.action.type === "navigate" && (i.action.href = v)))} placeholder="/signup" />
          </Field>
          <Field label={tt("New tab")}>
            <div className="flex h-7 items-center">
              <Switch checked={!!a.newTab} onCheckedChange={(v) => set((i) => void (i.action.type === "navigate" && (i.action.newTab = v)))} />
            </div>
          </Field>
        </>
      )}
    </div>
  );
}

function InteractionsSection({ node }: { node: Node }) {
  const t = useT();
  const brick = findBrick(node.brick)!;
  const update = useStudio((s) => s.update);
  if (!brick.clickable) return null;
  return (
    <Section
      title={t("Interactions")}
      aside={
        <Button
          variant="ghost"
          size="xs"
          onClick={() => update((d) => void d.nodes[node.id].interactions.push({ trigger: "click", action: { type: "navigate", href: "/" } }))}
        >
          <Plus /> {t("Add")}
        </Button>
      }
    >
      {node.interactions.length === 0 && <p className="text-[12px] text-muted-foreground">{t("None. Example: on click, open a Drawer or change the value of a number.")}</p>}
      {node.interactions.map((it, i) => (
        <InteractionRow key={i} node={node} index={i} it={it} />
      ))}
      {node.interactions.length > 0 && <p className="text-[11px] text-muted-foreground">{t("Try them in Interactive mode (top bar).")}</p>}
    </Section>
  );
}

const EASINGS = [
  ...BEAUTIFUL_UI_EASINGS,
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.22, 1, 0.36, 1)", label: "Expressive (expo out)" },
  { value: "cubic-bezier(0.34, 1.56, 0.64, 1)", label: "Slight bounce" },
];
const PRESET_LABELS: Record<string, string> = { none: "None", fade: "Fade", "fade-up": "Fade up (8 px)", "pop-in": "Pop in (zoom 95%)", "slide-up": "Slide up", "slide-down": "Slide down", scale: "Zoom", "blur-in": "Blur → sharp" };

function AnimationSection({ node }: { node: Node }) {
  const t = useT();
  const update = useStudio((s) => s.update);
  const a: AnimationSpec = node.animation ?? { preset: "none", on: "mount", durationMs: 400, delayMs: 0, easing: "ease-out", reducedMotion: "disable" };
  const set = (patch: Partial<AnimationSpec>, coalesce?: string) =>
    update(
      (d) => {
        d.nodes[node.id].animation = { ...a, ...patch };
        if (d.nodes[node.id].animation!.preset === "none") delete d.nodes[node.id].animation;
      },
      { coalesce: coalesce ? `anim:${node.id}:${coalesce}` : undefined },
    );
  return (
    <Section
      title={t("Animation")}
      defaultOpen={!!node.animation}
      aside={
        node.animation && (
          <Button variant="ghost" size="xs" onClick={() => useStudio.setState((s) => ({ replayKey: s.replayKey + 1 }))}>
            <Play /> {t("Replay")}
          </Button>
        )
      }
    >
      <MotionPresets node={node} />
      <Field label={t("Type")}>
        <SelectInput value={a.preset} onChange={(v) => set({ preset: v as AnimationSpec["preset"] })} options={ANIMATION_PRESETS.map((p) => ({ value: p, label: t(PRESET_LABELS[p]) }))} />
      </Field>
      {a.preset !== "none" && (
        <>
          <Field label={t("Trigger")}>
            <Segmented ariaLabel={t("Trigger")} value={a.on} onChange={(v) => set({ on: v as AnimationSpec["on"] })} options={[{ value: "mount", label: t("Mount") }, { value: "in-view", label: t("Scroll") }, { value: "hover", label: t("Hover") }]} />
          </Field>
          <Field label={t("Duration")}>
            <SliderInput value={a.durationMs} min={100} max={2000} step={50} onChange={(v) => set({ durationMs: v }, "dur")} format={(v) => `${v} ms`} />
          </Field>
          <Field label={t("Delay")}>
            <SliderInput value={a.delayMs} min={0} max={2000} step={50} onChange={(v) => set({ delayMs: v }, "delay")} format={(v) => `${v} ms`} />
          </Field>
          <Field label={t("Easing")}>
            <SelectInput value={a.easing} onChange={(v) => set({ easing: v })} options={(EASINGS.some((e) => e.value === a.easing) ? EASINGS : [...EASINGS, { value: a.easing, label: a.easing }]).map((e) => ({ value: e.value, label: t(e.label) }))} />
          </Field>
          <Field label={t("Reduced motion")} hint={t("Behavior when the user has enabled prefers-reduced-motion")}>
            <Segmented ariaLabel={t("Reduced motion")} value={a.reducedMotion} onChange={(v) => set({ reducedMotion: v as AnimationSpec["reducedMotion"] })} options={[{ value: "disable", label: t("Disable") }, { value: "fade-only", label: t("Fade only") }]} />
          </Field>
        </>
      )}
    </Section>
  );
}

/** Préréglages d'animation repris des règles de Beautiful UI (beautifului.dev, MIT) */
function MotionPresets({ node }: { node: Node }) {
  const { locale, t } = useLocale();
  const update = useStudio((s) => s.update);
  const doc = useStudio((s) => s.doc)!;
  const children = Object.values(node.slots).flat();
  const apply = (p: (typeof BEAUTIFUL_UI_MOTION)[number]) =>
    update((d) => {
      if (p.stagger) {
        children.forEach((cid, i) => {
          if (d.nodes[cid]) d.nodes[cid].animation = { ...p.spec, delayMs: p.spec.delayMs + i * p.stagger!, origin: "beautiful-ui" };
        });
      } else d.nodes[node.id].animation = { ...p.spec, origin: "beautiful-ui" };
    });
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted-foreground">
        {t("Beautiful UI presets")} <span className="opacity-70">(MIT — beautifului.dev)</span>
      </span>
      <div className="flex flex-wrap gap-1">
        {BEAUTIFUL_UI_MOTION.filter((p) => !p.stagger || children.length > 1).map((p) => (
          <Button key={p.id} variant="outline" size="xs" title={t(p.description)} onClick={() => apply(p)}>
            {t(p.label)}
          </Button>
        ))}
      </div>
      {children.length > 1 && <span className="text-[11px] text-muted-foreground">{t("“Staggered entrance” applies to the {n} children of {name}.", { n: children.length, name: translateNodeName(locale, doc.nodes[node.id]?.name ?? "") })}</span>}
    </div>
  );
}

export function BehaviorPanel() {
  const t = useT();
  const node = useSelectedNode();
  if (!node) return <EmptyState>{t("Select an element on the canvas or in the layers.")}</EmptyState>;
  const brick = findBrick(node.brick);
  if (!brick || node.brick === "raw.jsx")
    return (
      <>
        <NodeHeader node={node} />
        <EmptyState>{t("This code fragment was not recognized: edit it in the Code tab.")}</EmptyState>
      </>
    );
  return (
    <div>
      <NodeHeader node={node} />
      <StatePicker node={node} />
      <PropsSection node={node} />
      <InteractionsSection node={node} />
      <AnimationSection node={node} />
    </div>
  );
}
