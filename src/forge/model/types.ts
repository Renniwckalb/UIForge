/**
 * Modèle JSON du composant — source de vérité unique du studio.
 * Le TSX est généré depuis ce modèle (codegen) et le TSX édité est reparsé vers lui (parser).
 * Ce fichier est pur (aucune dépendance React) pour être utilisable côté Node (scripts, tests).
 */

export type NodeId = string;
export type BrickId = string;
export type PropValue = string | number | boolean;

/** Une valeur de style passe toujours par une variable CSS : soit un token du thème, soit une valeur propre au nœud. */
export type StyleValue = { token: string } | { value: string };

export const STYLE_KEYS = [
  "bg",
  "fg",
  "borderColor",
  "borderWidth",
  "radius",
  "shadow",
  "px",
  "py",
  "mt",
  "mb",
  "gap",
  "width",
  "maxWidth",
  "minHeight",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textAlign",
  "opacity",
] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];
export type StyleDecl = Partial<Record<StyleKey, StyleValue>>;

export const STYLE_STATES = ["hover", "focus", "active", "disabled"] as const;
export type StyleState = (typeof STYLE_STATES)[number];

/** Breakpoints Tailwind (min-width) : base = mobile, md = tablette, lg = desktop */
export const BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];
export const BREAKPOINT_MIN: Record<Breakpoint, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 };

/** base + états (survol…) + surcharges par breakpoint */
export type StyleSpec = { base: StyleDecl } & Partial<Record<StyleState, StyleDecl>> & Partial<Record<Breakpoint, StyleDecl>>;

export type TextBinding = {
  /** Valeur par défaut (string) ou éléments de liste (string[]) */
  value: string | string[];
  /** true → devient une prop du composant exporté */
  expose: boolean;
  /** Nom de la prop exportée */
  propName: string;
};

export type InteractionAction =
  | { type: "open" | "close" | "toggle"; target: NodeId }
  | { type: "setValue"; target: NodeId; value: number }
  | { type: "navigate"; href: string; newTab?: boolean }
  /** Instruction non reconnue par le parseur, conservée telle quelle */
  | { type: "custom"; code: string };

export type Interaction = { trigger: "click"; action: InteractionAction };

export const ANIMATION_PRESETS = ["none", "fade", "fade-up", "pop-in", "slide-up", "slide-down", "scale", "blur-in"] as const;
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export type AnimationSpec = {
  preset: AnimationPreset;
  on: "mount" | "hover" | "in-view";
  durationMs: number;
  delayMs: number;
  easing: string;
  /** Comportement si l'utilisateur a activé prefers-reduced-motion */
  reducedMotion: "disable" | "fade-only";
  /** Préréglage d'origine (attribution dans les exports), ex. "beautiful-ui" */
  origin?: string;
};

export type Node = {
  id: NodeId;
  brick: BrickId;
  name: string;
  parentId: NodeId | null;
  slots: Record<string, NodeId[]>;
  props: Record<string, PropValue>;
  texts: Record<string, TextBinding>;
  style: StyleSpec;
  interactions: Interaction[];
  animation?: AnimationSpec;
  /** Classes Tailwind saisies à la main (hors panneaux), fusionnées avec cn() — elles gagnent en cas de conflit */
  className?: string;
  /** Expression className non littérale saisie dans le code, conservée telle quelle */
  classNameExpr?: string;
  /** Attributs JSX non reconnus, conservés tels quels (nom → source de la valeur, "" = attribut nu) */
  extraAttrs?: Record<string, string>;
};

export type ColorScheme = "light" | "dark";

export type ThemeTokens = {
  /** Couleurs (noms compatibles shadcn : primary, background, card…) par schéma */
  color: Record<ColorScheme, Record<string, string>>;
  radius: string; // --radius (les rayons sm/md/lg en dérivent)
  space: Record<string, string>;
  shadow: Record<string, string>;
  font: { sans: string; heading: string; mono: string };
  fontSize: Record<string, string>;
  /** Schéma par défaut du composant exporté */
  defaultScheme: ColorScheme;
  /** Tokens couleur exposés comme props (ex. primary → primaryColor) */
  exposed: { token: string; propName: string }[];
  /** Préréglage d'origine (attribution dans les exports) */
  preset?: ThemePresetRef;
};

export type ThemePresetRef = { id: string; name: string; source: string; license: string; copyright: string };

export type ComponentDoc = {
  schemaVersion: 1;
  id: string;
  /** Nom PascalCase du composant exporté */
  name: string;
  rootId: NodeId;
  nodes: Record<NodeId, Node>;
  theme: ThemeTokens;
  /** Props de briques exposées comme props du composant (variantes clés) */
  exposedProps: { nodeId: NodeId; prop: string; propName: string }[];
  /** Imports non reconnus, conservés et réécrits à l'identique */
  preservedImports?: string[];
  /** Code non reconnu conservé : déclarations de module et instructions du corps du composant */
  preservedCode?: { module: string[]; body: string[] };
  meta: { createdAt: string; updatedAt: string; template?: string };
};

export type Diagnostic = {
  severity: "error" | "warning" | "info";
  message: string;
  /** positions 1-based (Monaco) */
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
};
