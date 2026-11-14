import type { Breakpoint } from "../model/types";

/** Largeurs simulées des viewports du studio */
export const VIEWPORT_WIDTHS = { mobile: 390, tablet: 820, desktop: 1280 } as const;
export type ViewportName = keyof typeof VIEWPORT_WIDTHS;

/** Calque de style édité selon le viewport actif : mobile = base, tablette = md, desktop = lg */
export const VIEWPORT_LAYER: Record<ViewportName, "base" | Breakpoint> = { mobile: "base", tablet: "md", desktop: "lg" };
