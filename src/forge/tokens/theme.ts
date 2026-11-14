import type { StyleKey, ThemeTokens } from "../model/types";

export const COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
] as const;

export const COLOR_LABELS: Record<string, string> = {
  background: "Background",
  foreground: "Text",
  card: "Card",
  "card-foreground": "Card text",
  popover: "Floating",
  "popover-foreground": "Floating text",
  primary: "Primary",
  "primary-foreground": "Text on primary",
  secondary: "Secondary",
  "secondary-foreground": "Text on secondary",
  muted: "Muted",
  "muted-foreground": "Muted text",
  accent: "Accent",
  "accent-foreground": "Text on accent",
  destructive: "Danger",
  border: "Border",
  input: "Input border",
  ring: "Focus",
};

export const RADIUS_STEPS: Record<string, number> = { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, "2xl": 1.8 };

export function defaultTheme(): ThemeTokens {
  return {
    color: {
      light: {
        background: "#ffffff",
        foreground: "#0a0a0a",
        card: "#ffffff",
        "card-foreground": "#0a0a0a",
        popover: "#ffffff",
        "popover-foreground": "#0a0a0a",
        primary: "#171717",
        "primary-foreground": "#fafafa",
        secondary: "#f4f4f5",
        "secondary-foreground": "#18181b",
        muted: "#f4f4f5",
        "muted-foreground": "#71717a",
        accent: "#f4f4f5",
        "accent-foreground": "#18181b",
        destructive: "#dc2626",
        border: "#e4e4e7",
        input: "#e4e4e7",
        ring: "#a1a1aa",
      },
      dark: {
        background: "#09090b",
        foreground: "#fafafa",
        card: "#18181b",
        "card-foreground": "#fafafa",
        popover: "#18181b",
        "popover-foreground": "#fafafa",
        primary: "#fafafa",
        "primary-foreground": "#18181b",
        secondary: "#27272a",
        "secondary-foreground": "#fafafa",
        muted: "#27272a",
        "muted-foreground": "#a1a1aa",
        accent: "#27272a",
        "accent-foreground": "#fafafa",
        destructive: "#ef4444",
        border: "#2f2f33",
        input: "#3a3a3f",
        ring: "#71717a",
      },
    },
    radius: "0.625rem",
    space: {
      "0": "0px",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "16": "4rem",
      "24": "6rem",
    },
    shadow: {
      none: "none",
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.06)",
      md: "0 4px 12px -2px rgb(0 0 0 / 0.10)",
      lg: "0 12px 32px -8px rgb(0 0 0 / 0.18)",
      xl: "0 24px 56px -12px rgb(0 0 0 / 0.25)",
    },
    font: {
      sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      heading: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "3.75rem",
    },
    defaultScheme: "light",
    exposed: [{ token: "primary", propName: "primaryColor" }],
  };
}

export const FONT_CHOICES: { label: string; value: string }[] = [
  { label: "System (sans-serif)", value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: "Serif", value: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Humanist", value: 'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", sans-serif' },
  { label: "Geometric", value: 'Avenir, Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif' },
];

/** Groupe de tokens pertinent pour chaque propriété de style */
export const STYLE_TOKEN_GROUP: Record<StyleKey, "color" | "radius" | "space" | "shadow" | "font" | "text" | null> = {
  bg: "color",
  fg: "color",
  borderColor: "color",
  borderWidth: null,
  radius: "radius",
  shadow: "shadow",
  px: "space",
  py: "space",
  mt: "space",
  mb: "space",
  gap: "space",
  width: null,
  maxWidth: null,
  minHeight: null,
  fontFamily: "font",
  fontSize: "text",
  fontWeight: null,
  lineHeight: null,
  textAlign: null,
  opacity: null,
};

/** Liste des tokens disponibles d'un groupe : [id du token, libellé] */
export function tokensOfGroup(theme: ThemeTokens, group: NonNullable<(typeof STYLE_TOKEN_GROUP)[StyleKey]>): [string, string][] {
  switch (group) {
    case "color":
      return COLOR_TOKENS.map((c) => [`color.${c}`, COLOR_LABELS[c] ?? c]);
    case "radius":
      return [["radius.none", "None"], ...Object.keys(RADIUS_STEPS).map((k) => [`radius.${k}`, k] as [string, string]), ["radius.full", "Pill"]];
    case "space":
      return Object.keys(theme.space).map((k) => [`space.${k}`, `${k} · ${theme.space[k]}`]);
    case "shadow":
      return Object.keys(theme.shadow).map((k) => [`shadow.${k}`, k]);
    case "font":
      return [
        ["font.sans", "Text"],
        ["font.heading", "Headings"],
        ["font.mono", "Mono"],
      ];
    case "text":
      return Object.keys(theme.fontSize).map((k) => [`text.${k}`, `${k} · ${theme.fontSize[k]}`]);
  }
}

/** Token → variable CSS (compatible avec les noms utilisés par shadcn/Tailwind v4) */
export function tokenVar(token: string): string {
  const [group, name] = token.split(/\.(.+)/);
  switch (group) {
    case "color":
      return `var(--${name})`;
    case "radius":
      if (name === "none") return "0px";
      if (name === "full") return "9999px";
      return `var(--radius-${name})`;
    case "space":
      return `var(--space-${name})`;
    case "shadow":
      return `var(--shadow-${name})`;
    case "font":
      return `var(--font-${name})`;
    case "text":
      return `var(--text-${name})`;
    default:
      return "initial";
  }
}

/** Valeur concrète d'un token (utile pour l'affichage dans le panneau) */
export function tokenValue(theme: ThemeTokens, token: string, scheme: "light" | "dark" = "light"): string | undefined {
  const [group, name] = token.split(/\.(.+)/);
  switch (group) {
    case "color":
      return theme.color[scheme][name];
    case "space":
      return theme.space[name];
    case "shadow":
      return theme.shadow[name];
    case "text":
      return theme.fontSize[name];
    case "font":
      return (theme.font as Record<string, string>)[name];
    case "radius":
      return name in RADIUS_STEPS ? `calc(${theme.radius} * ${RADIUS_STEPS[name]})` : name === "full" ? "9999px" : "0px";
  }
  return undefined;
}
