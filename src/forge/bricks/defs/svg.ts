import type { BrickDefinition } from "../types";

export const SVG_BRICK_ID = "html.svg";

/** Dessin par défaut : en currentColor, il prend la couleur du texte (style « Texte ») */
export const DEFAULT_SVG_MARKUP = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`,
  `  <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>`,
  `</svg>`,
].join("\n");

/**
 * SVG en ligne (illustration, logo, pictogramme). Le balisage est nettoyé (svg/svg.ts) et rendu en vrai JSX
 * dans l'export : le gabarit ci-dessous ne sert qu'aux métadonnées (rendu, codegen et parseur le traitent à part).
 */
export const svgBrick: BrickDefinition = {
  id: SVG_BRICK_ID,
  short: "svg",
  family: "foundations",
  library: { name: "SVG", url: "https://developer.mozilla.org/docs/Web/SVG", npm: [] },
  label: "SVG drawing",
  description: "Inline SVG: illustration, logo or pictogram. Paste or import any SVG; currentColor follows the text color.",
  icon: "Shapes",
  keywords: ["svg", "dessin", "drawing", "illustration", "logo", "vector", "vectoriel", "image", "icône", "icon", "pictogramme"],
  props: {
    markup: {
      type: "string",
      label: "SVG code",
      default: DEFAULT_SVG_MARKUP,
      help: "Scripts, event handlers and external references are removed. Size it with the Width style.",
    },
  },
  texts: [{ key: "label", label: "Accessible label", kind: "text", default: "", propHint: "svgLabel", expose: false }],
  styleTargets: ["fg", "bg", "width", "maxWidth", "radius", "px", "py", "mt", "mb", "opacity", "borderColor", "borderWidth"],
  states: ["hover"],
  imports: [],
  tpl: { el: "svg", styled: true, classes: "block h-auto max-w-full shrink-0", attrs: { "aria-label": { text: "label" } } },
  defaultStyle: { width: { value: "4rem" } },
};
