import type { BrickDefinition } from "../types";
import { LUCIDE_ICON_ALIASES, LUCIDE_ICON_NAMES } from "../../icons/lucide";

export const ICON_BRICK_ID = "lucide.icon";
export const DEFAULT_ICON = "Star";

/**
 * Nom d'icône → composant exporté par lucide-react (<Nom>Icon) : le même gabarit sert au rendu, au codegen et
 * au parseur. Les anciens noms (Trash2Icon…) sont reconnus dans le code puis convertis (normalizeDoc).
 */
const TAGS: Record<string, string> = Object.fromEntries([...LUCIDE_ICON_NAMES, ...Object.keys(LUCIDE_ICON_ALIASES)].map((n) => [n, `${n}Icon`]));

export const iconBrick: BrickDefinition = {
  id: ICON_BRICK_ID,
  short: "icon",
  family: "foundations",
  library: { name: "Lucide", url: "https://lucide.dev/icons", npm: ["lucide-react"] },
  label: "Icon",
  description: "Lucide icon chosen by name (2,000+ icons). Its color follows the text color.",
  icon: "Smile",
  keywords: ["icon", "icône", "icone", "lucide", "pictogramme", "symbole", "symbol", "glyph"],
  props: {
    name: { type: "string", label: "Icon", default: DEFAULT_ICON, help: "Lucide icon name in PascalCase, e.g. ArrowRight (lucide.dev/icons)" },
    strokeWidth: { type: "number", label: "Stroke width", default: 2, min: 0.5, max: 3, step: 0.25 },
  },
  texts: [{ key: "label", label: "Accessible label", kind: "text", default: "", propHint: "iconLabel", expose: false }],
  styleTargets: ["fg", "bg", "width", "radius", "px", "py", "mt", "mb", "opacity", "borderColor", "borderWidth"],
  states: ["hover"],
  imports: [{ from: "lucide-react", named: Object.values(TAGS) }],
  tpl: {
    el: { prop: "name", map: TAGS },
    styled: true,
    classes: "h-auto shrink-0",
    // lucide-react ajoute aria-hidden="true" seul, sauf si un attribut aria-* est présent
    attrs: { strokeWidth: { prop: "strokeWidth" }, "aria-label": { text: "label" } },
  },
  defaultStyle: { width: { value: "1.5rem" } },
};
