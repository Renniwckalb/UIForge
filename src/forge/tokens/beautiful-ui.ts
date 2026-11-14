/**
 * Préréglages issus de Beautiful UI — https://beautifului.dev
 * Licence MIT, Copyright (c) 2026 Shane Levine (https://beautifului.dev/license).
 *
 * Valeurs relevées dans la feuille de style officielle du site (variables :root / .dark, @keyframes,
 * animations inline) le 2026-11-13. Correspondance avec les tokens du studio :
 *   page → background · surface → card/popover · ink → foreground · ink-2 → muted-foreground
 *   canvas → secondary/muted · hover → accent · line → border · line-strong → input · accent → primary/ring
 *   rayons chip/control/card/window = 6/8/10/14 px → --radius 10px (sm ×0.6, md ×0.8, lg ×1, xl ×1.4)
 */
import type { AnimationSpec, ThemePresetRef, ThemeTokens } from "../model/types";

export const BEAUTIFUL_UI_REF: ThemePresetRef = {
  id: "beautiful-ui",
  name: "Beautiful UI",
  source: "https://beautifului.dev",
  license: "MIT",
  copyright: "Copyright (c) 2026 Shane Levine",
};

export const BEAUTIFUL_UI_THEME: Pick<ThemeTokens, "color" | "radius" | "shadow" | "font" | "fontSize"> = {
  color: {
    light: {
      background: "oklch(98.5% 0.001 286.376)",
      foreground: "oklch(24.7% 0.006 258.361)",
      card: "oklch(100% 0 0)",
      "card-foreground": "oklch(24.7% 0.006 258.361)",
      popover: "oklch(100% 0 0)",
      "popover-foreground": "oklch(24.7% 0.006 258.361)",
      primary: "oklch(62.6% 0.205 254.947)",
      "primary-foreground": "oklch(100% 0 0)",
      secondary: "oklch(96.1% 0.002 247.84)",
      "secondary-foreground": "oklch(24.7% 0.006 258.361)",
      muted: "oklch(96.1% 0.002 247.84)",
      "muted-foreground": "oklch(50.6% 0.01 264.477)",
      accent: "oklch(97% 0.002 247.839)",
      "accent-foreground": "oklch(24.7% 0.006 258.361)",
      destructive: "oklch(62.1% 0.192 23.042)",
      border: "oklch(94.6% 0.003 264.542)",
      input: "oklch(91.2% 0.005 258.326)",
      ring: "oklch(62.6% 0.205 254.947)",
    },
    dark: {
      background: "oklch(20.9% 0.004 264.477)",
      foreground: "oklch(96.4% 0.002 247.839)",
      card: "oklch(26% 0.006 271.191)",
      "card-foreground": "oklch(96.4% 0.002 247.839)",
      popover: "oklch(26% 0.006 271.191)",
      "popover-foreground": "oklch(96.4% 0.002 247.839)",
      primary: "oklch(68% 0.173 253.301)",
      "primary-foreground": "oklch(100% 0 0)",
      secondary: "oklch(23.1% 0.004 264.487)",
      "secondary-foreground": "oklch(96.4% 0.002 247.839)",
      muted: "oklch(23.1% 0.004 264.487)",
      "muted-foreground": "oklch(73.1% 0.008 260.731)",
      accent: "oklch(28.9% 0.006 271.22)",
      "accent-foreground": "oklch(96.4% 0.002 247.839)",
      destructive: "oklch(66.6% 0.18 21.433)",
      border: "oklch(30.8% 0.006 258.354)",
      input: "oklch(35.6% 0.007 264.474)",
      ring: "oklch(68% 0.173 253.301)",
    },
  },
  radius: "0.625rem",
  shadow: {
    none: "none",
    sm: "0 0 4px 0 #0000000a",
    md: "0 0 0 1px var(--border), 0 18px 47px 0 #00000008, 0 7.5px 19px 0 #00000005, 0 4px 10.5px 0 #00000005, 0 2.3px 5.8px 0 #00000003, 0 1.2px 3.1px 0 #00000003, 0 .5px 1.3px 0 #00000003",
    lg: "0 0 0 1px var(--border), 0 17.54px 23.39px 0 #0000000a, 0 9.4px 12.5px 0 #00000008, 0 5.25px 7px 0 #00000005, 0 2.79px 3.72px -2px #00000003, 0 1.16px 1.5px 0 #00000003",
    xl: "0 0 0 1px var(--border), 0 25px 50px 0 #0000000d, 0 12px 24px 0 #0000000a, 0 6px 12px 0 #00000008, 0 3px 6px 0 #00000005, 0 1.5px 3px 0 #00000005",
  },
  font: {
    sans: 'var(--font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif',
    heading: 'var(--font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-jetbrains-mono, "JetBrains Mono"), ui-monospace, "SF Mono", monospace',
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
};

/** Courbes d'accélération de Beautiful UI */
export const BEAUTIFUL_UI_EASINGS = [
  { value: "cubic-bezier(0.23, 1, 0.32, 1)", label: "Beautiful UI · ease-out-strong" },
  { value: "cubic-bezier(0.16, 1, 0.3, 1)", label: "Beautiful UI · ease-link" },
  { value: "cubic-bezier(0.77, 0, 0.175, 1)", label: "Beautiful UI · ease-in-out-strong" },
  { value: "cubic-bezier(0, 0, 0.2, 1)", label: "Beautiful UI · ease-out" },
];

type MotionPreset = { id: string; label: string; description: string; spec: AnimationSpec; stagger?: number };

const strong = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Règles d'animation de Beautiful UI ; prefers-reduced-motion : animations coupées, comme sur le site */
export const BEAUTIFUL_UI_MOTION: MotionPreset[] = [
  {
    id: "enter",
    label: "Entrance",
    description: "fade-up 8 px, 450 ms, ease-out-strong",
    spec: { preset: "fade-up", on: "mount", durationMs: 450, delayMs: 0, easing: strong, reducedMotion: "disable" },
  },
  {
    id: "enter-slow",
    label: "Slow entrance",
    description: "fade-up 8 px, 600 ms, ease-out-strong (sections)",
    spec: { preset: "fade-up", on: "mount", durationMs: 600, delayMs: 0, easing: strong, reducedMotion: "disable" },
  },
  {
    id: "pop",
    label: "Pop in",
    description: "pop-in (zoom 95%), 160 ms, ease-out-strong — menus, chips",
    spec: { preset: "pop-in", on: "mount", durationMs: 160, delayMs: 0, easing: strong, reducedMotion: "disable" },
  },
  {
    id: "reveal",
    label: "Reveal on scroll",
    description: "fade-up triggered when entering the view, 600 ms",
    spec: { preset: "fade-up", on: "in-view", durationMs: 600, delayMs: 0, easing: strong, reducedMotion: "disable" },
  },
  {
    id: "hover",
    label: "Hover",
    description: "transition 180 ms, ease-out (0, 0, 0.2, 1)",
    spec: { preset: "fade-up", on: "hover", durationMs: 180, delayMs: 0, easing: "cubic-bezier(0, 0, 0.2, 1)", reducedMotion: "disable" },
  },
  {
    id: "stagger",
    label: "Staggered children entrance",
    description: "fade-up 450 ms, each child offset by 80 ms",
    spec: { preset: "fade-up", on: "mount", durationMs: 450, delayMs: 0, easing: strong, reducedMotion: "disable" },
    stagger: 80,
  },
];
