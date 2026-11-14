"use client";
import * as React from "react";
import type { ColorScheme, ComponentDoc, ThemeTokens } from "@/forge/model/types";
import { COLOR_LABELS, COLOR_TOKENS, defaultTheme, FONT_CHOICES } from "@/forge/tokens/theme";
import { uniquePropName } from "@/forge/model/ops";
import { BEAUTIFUL_UI_REF, BEAUTIFUL_UI_THEME } from "@/forge/tokens/beautiful-ui";
import { useStudio } from "@/forge/store/studio";
import { Button } from "@/components/ui/button";
import { BufferedInput, ColorInput, ColorSwatch, Field, Section, Segmented, SelectInput, SliderInput } from "./controls";
import { useT } from "@/i18n/react";

const BASE_SPACE: Record<string, number> = { "0": 0, "1": 0.25, "2": 0.5, "3": 0.75, "4": 1, "5": 1.25, "6": 1.5, "8": 2, "10": 2.5, "12": 3, "16": 4, "24": 6 };

type Preset = { id: string; label: string; light: Partial<Record<string, string>>; dark: Partial<Record<string, string>>; radius?: string };
const PRESETS: Preset[] = [
  { id: "neutral", label: "Neutral", light: {}, dark: {} },
  {
    id: "blue",
    label: "Blue",
    light: { primary: "#2563eb", "primary-foreground": "#ffffff", ring: "#93c5fd", accent: "#eff6ff", "accent-foreground": "#1e3a8a" },
    dark: { primary: "#3b82f6", "primary-foreground": "#ffffff", ring: "#1d4ed8", accent: "#172554", "accent-foreground": "#dbeafe" },
  },
  {
    id: "green",
    label: "Green",
    light: { primary: "#15803d", "primary-foreground": "#ffffff", ring: "#86efac", accent: "#f0fdf4", "accent-foreground": "#14532d" },
    dark: { primary: "#22c55e", "primary-foreground": "#052e16", ring: "#15803d", accent: "#052e16", "accent-foreground": "#dcfce7" },
  },
  {
    id: "slate",
    label: "Slate",
    light: { primary: "#334155", "primary-foreground": "#f8fafc", muted: "#f1f5f9", "muted-foreground": "#64748b", border: "#e2e8f0", input: "#e2e8f0", secondary: "#f1f5f9", accent: "#f1f5f9" },
    dark: { primary: "#e2e8f0", "primary-foreground": "#0f172a", background: "#020617", card: "#0f172a", popover: "#0f172a", muted: "#1e293b", secondary: "#1e293b", accent: "#1e293b", border: "#1e293b" },
    radius: "0.375rem",
  },
  {
    id: "warm",
    label: "Terracotta",
    light: { primary: "#c2410c", "primary-foreground": "#fff7ed", background: "#fffcf8", card: "#ffffff", muted: "#f7f1ea", accent: "#fff1e6", "accent-foreground": "#7c2d12", border: "#eadfd3", input: "#eadfd3" },
    dark: { primary: "#f97316", "primary-foreground": "#1c0a02", background: "#14100d", card: "#1d1814", popover: "#1d1814", muted: "#2a221c", accent: "#2a221c", border: "#3a2f27" },
    radius: "0.875rem",
  },
];

export function ThemePanel() {
  const t = useT();
  const theme = useStudio((s) => s.doc!.theme);
  const update = useStudio((s) => s.update);
  const [scheme, setScheme] = React.useState<ColorScheme>(useStudio.getState().scheme);
  const setTheme = (fn: (t: ThemeTokens, d: ComponentDoc) => void, coalesce?: string) =>
    update((d) => fn(d.theme as ThemeTokens, d as ComponentDoc), { coalesce: coalesce ? `theme:${coalesce}` : undefined });

  const spaceFactor = parseFloat(theme.space["4"]) || 1;
  const fontChoices = FONT_CHOICES.map((f) => ({ value: f.value, label: t(f.label) }));
  return (
    <div>
      <p className="border-b px-3 py-2.5 text-[12px] text-muted-foreground">
        {t("Global tokens applied to every element of the component. Exported as CSS variables.")}
      </p>
      <Section title={t("Presets")}>
        <button
          type="button"
          className={`flex flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left text-[12px] hover:bg-muted ${theme.preset?.id === "beautiful-ui" ? "border-foreground/40 bg-muted/60" : ""}`}
          onClick={() =>
            setTheme((t) => {
              t.color.light = { ...BEAUTIFUL_UI_THEME.color.light };
              t.color.dark = { ...BEAUTIFUL_UI_THEME.color.dark };
              t.radius = BEAUTIFUL_UI_THEME.radius;
              t.shadow = { ...BEAUTIFUL_UI_THEME.shadow };
              t.font = { ...BEAUTIFUL_UI_THEME.font };
              t.fontSize = { ...BEAUTIFUL_UI_THEME.fontSize };
              t.preset = { ...BEAUTIFUL_UI_REF };
            })
          }
        >
          <span className="flex items-center gap-1.5 font-medium">
            <ColorSwatch color={BEAUTIFUL_UI_THEME.color.light.primary} />
            Beautiful UI
          </span>
          <span className="text-[11px] text-muted-foreground">{t("Light/dark palette, Inter + JetBrains Mono, 6/8/10/14 px radii, layered shadows. MIT — beautifului.dev")}</span>
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => {
            const base = defaultTheme();
            const primary = p.light.primary ?? base.color.light.primary;
            return (
              <button
                key={p.id}
                type="button"
                className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] hover:bg-muted"
                onClick={() =>
                  setTheme((t) => {
                    t.color.light = { ...base.color.light, ...p.light } as Record<string, string>;
                    t.color.dark = { ...base.color.dark, ...p.dark } as Record<string, string>;
                    t.radius = p.radius ?? base.radius;
                    t.shadow = { ...base.shadow };
                    t.font = { ...base.font };
                    delete t.preset;
                  })
                }
              >
                <ColorSwatch color={primary} />
                {t(p.label)}
              </button>
            );
          })}
        </div>
      </Section>
      <Section title={t("Colors")}>
        <Segmented ariaLabel={t("Edited scheme")} value={scheme} onChange={(v) => setScheme(v as ColorScheme)} options={[{ value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }]} />
        {COLOR_TOKENS.map((c) => (
          <Field key={c} label={t(COLOR_LABELS[c])} hint={`--${c}`}>
            <ColorInput value={theme.color[scheme][c]} onChange={(v) => setTheme((t) => void (t.color[scheme][c] = v), `color:${scheme}:${c}`)} ariaLabel={`${t(COLOR_LABELS[c])} (${scheme === "light" ? t("light") : t("dark")})`} />
          </Field>
        ))}
      </Section>
      <Section title={t("Radii and spacing")}>
        <Field label={t("Base radius")} hint={t("--radius; sm/md/lg/xl derive from it")}>
          <SliderInput value={parseFloat(theme.radius) * 16} min={0} max={24} step={1} onChange={(v) => setTheme((t) => void (t.radius = `${v / 16}rem`), "radius")} format={(v) => `${v}px`} />
        </Field>
        <Field label={t("Space scale")} hint={t("Multiplies the whole --space-* scale")}>
          <SliderInput
            value={spaceFactor}
            min={0.75}
            max={1.5}
            step={0.05}
            onChange={(f) =>
              setTheme((th) => {
                for (const [k, base] of Object.entries(BASE_SPACE)) th.space[k] = base === 0 ? "0px" : `${Math.round(base * f * 1000) / 1000}rem`;
              }, "space")
            }
            format={(v) => `×${v.toFixed(2)}`}
          />
        </Field>
      </Section>
      <Section title={t("Typography")}>
        <Field label={t("Text")}>
          <SelectInput value={theme.font.sans} onChange={(v) => setTheme((th) => void (th.font.sans = v))} options={fontChoices} />
        </Field>
        <Field label={t("Headings")}>
          <SelectInput value={theme.font.heading} onChange={(v) => setTheme((th) => void (th.font.heading = v))} options={fontChoices} />
        </Field>
        {Object.keys(theme.fontSize).map((k) => (
          <Field key={k} label={t("Size {k}", { k })} hint={`--text-${k}`}>
            <BufferedInput value={theme.fontSize[k]} onCommit={(v) => setTheme((t) => void (t.fontSize[k] = v), `fs:${k}`)} className="font-mono" />
          </Field>
        ))}
      </Section>
      <Section title={t("Shadows")} defaultOpen={false}>
        {Object.keys(theme.shadow).map((k) => (
          <Field key={k} label={k} hint={`--shadow-${k}`}>
            <BufferedInput value={theme.shadow[k]} onCommit={(v) => setTheme((t) => void (t.shadow[k] = v), `sh:${k}`)} className="font-mono" />
          </Field>
        ))}
      </Section>
      <Section title={t("Export options")}>
        <Field label={t("Default scheme")} hint={t("Default value of the colorScheme prop")}>
          <Segmented
            ariaLabel={t("Default scheme")}
            value={theme.defaultScheme}
            onChange={(v) => setTheme((t) => void (t.defaultScheme = v as ColorScheme))}
            options={[{ value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }]}
          />
        </Field>
        <div className="text-[12px] text-muted-foreground">{t("Colors exposed as props:")}</div>
        {theme.exposed.map((e, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <SelectInput value={e.token} onChange={(v) => setTheme((t) => void (t.exposed[i].token = v))} options={COLOR_TOKENS.map((c) => ({ value: c, label: t(COLOR_LABELS[c]) }))} />
            <BufferedInput value={e.propName} onCommit={(v) => /^[A-Za-z_$][\w$]*$/.test(v) && setTheme((t) => void (t.exposed[i].propName = v), `exp:${i}`)} className="font-mono" aria-label={t("Prop name")} />
            <Button variant="ghost" size="xs" onClick={() => setTheme((t) => void t.exposed.splice(i, 1))}>
              {t("Remove")}
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="xs"
          className="self-start"
          onClick={() =>
            setTheme((t, d) => {
              const used = new Set(t.exposed.map((e) => e.token));
              const token = COLOR_TOKENS.find((c) => !used.has(c)) ?? "accent";
              t.exposed.push({ token, propName: uniquePropName(d, `${token.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Color`) });
            })
          }
        >
          {t("Expose a color")}
        </Button>
      </Section>
    </div>
  );
}
