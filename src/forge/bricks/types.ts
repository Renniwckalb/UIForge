/**
 * Définition déclarative d'une brique. Un même gabarit (`tpl`) sert à :
 *  - rendre la brique dans le canvas et la preview (runtime/Renderer)
 *  - générer le TSX exporté (codegen/tsx)
 *  - reconnaître la brique dans du TSX édité (parser/tsx)
 * Ce fichier est pur (pas de React) : les composants réels sont associés aux tags dans runtime/components.
 */
import type { PropValue, StyleKey, StyleState } from "../model/types";

export type Family = "foundations" | "specialists" | "designed";

export type PropField =
  | { type: "enum"; label: string; options: { value: string; label: string }[]; default: string; exposable?: boolean; help?: string }
  | { type: "boolean"; label: string; default: boolean; exposable?: boolean; help?: string }
  | { type: "number"; label: string; default: number; min: number; max: number; step: number; help?: string }
  | { type: "string"; label: string; default: string; help?: string };

export type TextField = {
  key: string;
  label: string;
  kind: "text" | "list";
  default: string | string[];
  /** Nom de prop proposé à l'export */
  propHint: string;
  multiline?: boolean;
};

/** Source d'un attribut JSX */
export type AttrSrc =
  | { prop: string } // valeur d'une prop de la brique (omise si = défaut, sauf `always`)
  | { prop: string; always: true }
  | { prop: string; mapObj: Record<string, Record<string, string | number | boolean> | string | boolean | null> } // prop → littéral (objet, chaîne, booléen ; null = omis)
  | { lit: PropValue } // valeur littérale fixe
  | { text: string } // valeur d'un champ texte (placeholder…)
  | { state: "value" } // valeur de l'état contrôlé (open / value)
  | { state: "setter" } // setter de l'état contrôlé (onOpenChange)
  | { scopeClass: true; extra?: string } // classes de portée (pour les contenus portés hors racine)
  | { scopeStyle: true }
  | { onClick: true } // interactions de clic
  | { openState: true } // ouvre l'état contrôlé de la brique au clic (déclencheur)
  | { inputRef: true }; // ref vers le champ (focus par raccourci)

export type TplEl = {
  /** Tag JSX : "div", "Button", "Drawer.Root"… ou choisi par une prop */
  el: string | { prop: string; map: Record<string, string> };
  attrs?: Record<string, AttrSrc>;
  /** Classes utilitaires fixes (structure/layout, jamais de couleurs) */
  classes?: string;
  /** Classes dérivées des props : prop → valeur → classes */
  classProps?: Record<string, Record<string, string>>;
  /** Attribut qui reçoit les classes (défaut : className) */
  classAttr?: string;
  /** Élément qui porte la classe du nœud (styles, animation, sélection dans le canvas) */
  styled?: boolean;
  /** Élément porté hors de la racine (portal) : reçoit aussi les classes/vars de portée */
  scope?: boolean;
  children?: TplNode[];
};

export type TplNode =
  | TplEl
  | { text: string } // champ texte
  | { slot: string } // enfants d'un slot
  | { list: string; item: TplEl } // liste de textes : item contient { itemText: true }
  | { itemText: true }
  | { ifProp: string; then: TplNode[] } // rendu conditionnel sur une prop booléenne
  | { ifText: string; then: TplNode[] } // rendu si le texte est non vide
  | { ifSlot: string; then: TplNode[] } // rendu si le slot contient des enfants (toujours rendu en édition)
  | { staticText: string }; // texte fixe (gabarits d'édition uniquement)

export type ImportSpec =
  | { from: string; named: (string | [string, string])[] } // [nom importé, alias]
  | { from: string; default: string };

export type StateSpec =
  | { kind: "open"; initialProp: string } // drawer, dialog… (open / onOpenChange)
  | { kind: "value"; initialProp: string; fromProp?: string }; // NumberFlow…

export type BrickDefinition = {
  id: string;
  /** Préfixe des ids de nœud (button1, card2…) ; permet au parseur de retrouver la brique */
  short: string;
  family: Family;
  library: {
    name: string;
    url: string;
    /** paquets npm utilisés directement par le gabarit */
    npm: string[];
    /** fichiers source copiés dans le dossier exporté (ui/button.tsx…) */
    vendored?: string[];
  };
  label: string;
  description: string;
  icon: string; // nom d'icône lucide (UI du studio)
  keywords: string[];
  props: Record<string, PropField>;
  texts: TextField[];
  slots?: Record<string, { label: string; accepts: "any" | "inline"; max?: number }>;
  styleTargets: StyleKey[];
  states: (StyleState | "loading")[];
  clickable?: boolean;
  state?: StateSpec;
  /** Brique de mise en page (conteneur) — sert à la racine */
  imports: ImportSpec[];
  tpl: TplEl;
  /** Gabarit de rendu en mode édition (overlays affichés en ligne) */
  editTpl?: TplEl;
  /** Code de hooks additionnels (ex. raccourci ⌘K). `s` = nom de l'état, `set` = setter */
  effect?: { kind: "hotkey"; shortcutProp: string; enableProp: string; action: "toggle" | "focus" } | { kind: "animateValue"; delayMs: number };
  /** Props exposées automatiquement comme props du composant exporté */
  exposeByDefault?: string[];
  /** Style appliqué par défaut à un nouveau nœud */
  defaultStyle?: Partial<Record<StyleKey, { token: string } | { value: string }>>;
};
