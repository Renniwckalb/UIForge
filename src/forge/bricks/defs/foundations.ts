import type { BrickDefinition } from "../types";

const SHADCN = (vendored: string[], npm: string[] = []) => ({
  name: "shadcn/ui",
  url: "https://ui.shadcn.com",
  npm,
  vendored,
});
const HTML = { name: "Primitives (HTML + Tailwind)", url: "https://tailwindcss.com", npm: [] };

const variantOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

export const stack: BrickDefinition = {
  id: "layout.stack",
  short: "stack",
  family: "foundations",
  library: HTML,
  label: "Container (Stack)",
  description: "Vertical or horizontal stack of elements, the basis of any layout.",
  icon: "Rows3",
  keywords: ["layout", "flex", "stack", "conteneur", "section", "div"],
  props: {
    direction: { type: "enum", label: "Direction", default: "column", options: [{ value: "column", label: "Vertical" }, { value: "row", label: "Horizontal" }] },
    align: { type: "enum", label: "Alignment", default: "stretch", options: variantOptions(["stretch", "start", "center", "end"]) },
    justify: { type: "enum", label: "Justify", default: "start", options: variantOptions(["start", "center", "end", "between"]) },
    wrap: { type: "boolean", label: "Wrap", default: false },
  },
  texts: [],
  slots: { children: { label: "Content", accepts: "any" } },
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "px", "py", "mt", "mb", "gap", "width", "maxWidth", "minHeight", "textAlign"],
  states: ["hover"],
  imports: [],
  tpl: {
    el: "div",
    styled: true,
    classes: "flex",
    classProps: {
      direction: { column: "flex-col", row: "flex-row" },
      align: { stretch: "items-stretch", start: "items-start", center: "items-center", end: "items-end" },
      justify: { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" },
      wrap: { true: "flex-wrap", false: "" },
    },
    children: [{ slot: "children" }],
  },
  defaultStyle: { gap: { token: "space.4" } },
};

export const grid: BrickDefinition = {
  id: "layout.grid",
  short: "grid",
  family: "foundations",
  library: HTML,
  label: "Grid",
  description: "Responsive grid with equal columns.",
  icon: "LayoutGrid",
  keywords: ["grid", "grille", "colonnes", "layout"],
  props: {
    columns: { type: "enum", label: "Columns", default: "3", options: variantOptions(["1", "2", "3", "4"]) },
  },
  texts: [],
  slots: { children: { label: "Cells", accepts: "any" } },
  styleTargets: ["bg", "borderColor", "borderWidth", "radius", "px", "py", "mt", "mb", "gap", "width", "maxWidth"],
  states: [],
  imports: [],
  tpl: {
    el: "div",
    styled: true,
    classes: "grid grid-cols-1",
    classProps: { columns: { "1": "sm:grid-cols-1", "2": "sm:grid-cols-2", "3": "sm:grid-cols-3", "4": "sm:grid-cols-4" } },
    children: [{ slot: "children" }],
  },
  defaultStyle: { gap: { token: "space.4" } },
};

export const heading: BrickDefinition = {
  id: "html.heading",
  short: "heading",
  family: "foundations",
  library: HTML,
  label: "Title",
  description: "Heading h1 to h4.",
  icon: "Heading",
  keywords: ["titre", "heading", "h1", "h2", "texte"],
  props: {
    level: { type: "enum", label: "Level", default: "2", options: [{ value: "1", label: "H1" }, { value: "2", label: "H2" }, { value: "3", label: "H3" }, { value: "4", label: "H4" }] },
  },
  texts: [{ key: "text", label: "Text", kind: "text", default: "Section title", propHint: "title" }],
  styleTargets: ["fg", "mt", "mb", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign", "maxWidth"],
  states: [],
  imports: [],
  tpl: {
    el: { prop: "level", map: { "1": "h1", "2": "h2", "3": "h3", "4": "h4" } },
    styled: true,
    children: [{ text: "text" }],
  },
  defaultStyle: { fontSize: { token: "text.2xl" }, fontWeight: { value: "600" }, lineHeight: { value: "1.2" }, fontFamily: { token: "font.heading" } },
};

export const text: BrickDefinition = {
  id: "html.text",
  short: "text",
  family: "foundations",
  library: HTML,
  label: "Paragraph",
  description: "Text block.",
  icon: "Pilcrow",
  keywords: ["texte", "paragraphe", "p", "description"],
  props: {},
  texts: [{ key: "text", label: "Text", kind: "text", default: "A short paragraph that describes your content.", propHint: "description", multiline: true }],
  styleTargets: ["fg", "mt", "mb", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign", "maxWidth"],
  states: [],
  imports: [],
  tpl: { el: "p", styled: true, children: [{ text: "text" }] },
  defaultStyle: { fg: { token: "color.muted-foreground" }, fontSize: { token: "text.sm" }, lineHeight: { value: "1.6" } },
};

export const button: BrickDefinition = {
  id: "shadcn.button",
  short: "button",
  family: "foundations",
  library: SHADCN(["ui/button.tsx"], ["lucide-react"]),
  label: "Button",
  description: "shadcn/ui button with variants, sizes and loading state.",
  icon: "RectangleHorizontal",
  keywords: ["button", "bouton", "cta", "action"],
  props: {
    variant: { type: "enum", label: "Variant", default: "default", exposable: true, options: variantOptions(["default", "secondary", "outline", "ghost", "destructive", "link"]) },
    size: { type: "enum", label: "Size", default: "default", exposable: true, options: variantOptions(["xs", "sm", "default", "lg"]) },
    disabled: { type: "boolean", label: "Disabled", default: false, exposable: true },
    loading: { type: "boolean", label: "Loading", default: false, exposable: true },
  },
  texts: [{ key: "label", label: "Label text", kind: "text", default: "Continue", propHint: "buttonLabel" }],
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "px", "py", "mt", "mb", "width", "fontSize", "fontWeight"],
  states: ["hover", "focus", "active", "disabled", "loading"],
  clickable: true,
  imports: [{ from: "./ui/button", named: ["Button"] }, { from: "lucide-react", named: ["LoaderCircleIcon"] }],
  tpl: {
    el: "Button",
    styled: true,
    attrs: { variant: { prop: "variant" }, size: { prop: "size" }, disabled: { prop: "disabled" }, "aria-busy": { prop: "loading" }, onClick: { onClick: true } },
    children: [{ ifProp: "loading", then: [{ el: "LoaderCircleIcon", classes: "animate-spin" }] }, { text: "label" }],
  },
};

export const input: BrickDefinition = {
  id: "shadcn.input",
  short: "input",
  family: "foundations",
  library: SHADCN(["ui/input.tsx"]),
  label: "Text field",
  description: "shadcn/ui input field.",
  icon: "TextCursorInput",
  keywords: ["input", "champ", "formulaire", "email"],
  props: {
    type: { type: "enum", label: "Type", default: "text", options: variantOptions(["text", "email", "password", "search", "number"]) },
    disabled: { type: "boolean", label: "Disabled", default: false },
  },
  texts: [{ key: "placeholder", label: "Placeholder", kind: "text", default: "you@example.com", propHint: "placeholder" }],
  styleTargets: ["bg", "fg", "borderColor", "radius", "shadow", "mt", "mb", "width", "fontSize"],
  states: ["hover", "focus", "disabled"],
  imports: [{ from: "./ui/input", named: ["Input"] }],
  tpl: { el: "Input", styled: true, attrs: { type: { prop: "type" }, placeholder: { text: "placeholder" }, disabled: { prop: "disabled" } } },
};

export const textarea: BrickDefinition = {
  id: "shadcn.textarea",
  short: "textarea",
  family: "foundations",
  library: SHADCN(["ui/textarea.tsx"]),
  label: "Textarea",
  description: "shadcn/ui multiline input.",
  icon: "LetterText",
  keywords: ["textarea", "message", "formulaire"],
  props: { disabled: { type: "boolean", label: "Disabled", default: false } },
  texts: [{ key: "placeholder", label: "Placeholder", kind: "text", default: "Your message…", propHint: "messagePlaceholder" }],
  styleTargets: ["bg", "fg", "borderColor", "radius", "mt", "mb", "width", "minHeight", "fontSize"],
  states: ["focus", "disabled"],
  imports: [{ from: "./ui/textarea", named: ["Textarea"] }],
  tpl: { el: "Textarea", styled: true, attrs: { placeholder: { text: "placeholder" }, disabled: { prop: "disabled" } } },
};

export const label: BrickDefinition = {
  id: "shadcn.label",
  short: "label",
  family: "foundations",
  library: SHADCN(["ui/label.tsx"]),
  label: "Label",
  description: "shadcn/ui field label (Radix Label).",
  icon: "Tag",
  keywords: ["label", "étiquette", "formulaire"],
  props: {},
  texts: [{ key: "text", label: "Text", kind: "text", default: "Email address", propHint: "fieldLabel" }],
  styleTargets: ["fg", "mt", "mb", "fontSize", "fontWeight"],
  states: [],
  imports: [{ from: "./ui/label", named: ["Label"] }],
  tpl: { el: "Label", styled: true, children: [{ text: "text" }] },
};

export const badge: BrickDefinition = {
  id: "shadcn.badge",
  short: "badge",
  family: "foundations",
  library: SHADCN(["ui/badge.tsx"]),
  label: "Badge",
  description: "Small shadcn/ui status label.",
  icon: "BadgeCheck",
  keywords: ["badge", "tag", "statut", "pill"],
  props: { variant: { type: "enum", label: "Variant", default: "secondary", exposable: true, options: variantOptions(["default", "secondary", "outline", "destructive"]) } },
  texts: [{ key: "text", label: "Text", kind: "text", default: "New", propHint: "badgeLabel" }],
  styleTargets: ["bg", "fg", "borderColor", "radius", "px", "py", "mt", "mb", "fontSize", "fontWeight"],
  states: ["hover"],
  imports: [{ from: "./ui/badge", named: ["Badge"] }],
  tpl: { el: "Badge", styled: true, attrs: { variant: { prop: "variant" } }, children: [{ text: "text" }] },
};

export const separator: BrickDefinition = {
  id: "shadcn.separator",
  short: "separator",
  family: "foundations",
  library: SHADCN(["ui/separator.tsx"]),
  label: "Separator",
  description: "shadcn/ui separator line (Radix Separator).",
  icon: "Minus",
  keywords: ["separator", "séparateur", "divider", "hr"],
  props: { orientation: { type: "enum", label: "Orientation", default: "horizontal", options: variantOptions(["horizontal", "vertical"]) } },
  texts: [],
  styleTargets: ["bg", "mt", "mb"],
  states: [],
  imports: [{ from: "./ui/separator", named: ["Separator"] }],
  tpl: { el: "Separator", styled: true, attrs: { orientation: { prop: "orientation" } } },
};

export const switchField: BrickDefinition = {
  id: "shadcn.switch",
  short: "switch",
  family: "foundations",
  library: SHADCN(["ui/switch.tsx"]),
  label: "Switch",
  description: "shadcn/ui switch (Radix Switch) with label.",
  icon: "ToggleRight",
  keywords: ["switch", "toggle", "interrupteur", "option"],
  props: {
    defaultChecked: { type: "boolean", label: "Enabled by default", default: false },
    disabled: { type: "boolean", label: "Disabled", default: false },
  },
  texts: [{ key: "label", label: "Label text", kind: "text", default: "Get product updates", propHint: "switchLabel" }],
  styleTargets: ["fg", "gap", "mt", "mb", "fontSize"],
  states: ["disabled"],
  imports: [{ from: "./ui/switch", named: ["Switch"] }],
  tpl: {
    el: "label",
    styled: true,
    classes: "flex items-center gap-2 text-sm",
    children: [{ el: "Switch", attrs: { defaultChecked: { prop: "defaultChecked" }, disabled: { prop: "disabled" } } }, { el: "span", children: [{ text: "label" }] }],
  },
};

export const checkbox: BrickDefinition = {
  id: "shadcn.checkbox",
  short: "checkbox",
  family: "foundations",
  library: SHADCN(["ui/checkbox.tsx"]),
  label: "Checkbox",
  description: "shadcn/ui checkbox (Radix Checkbox) with label.",
  icon: "SquareCheck",
  keywords: ["checkbox", "case", "cocher", "accepter"],
  props: {
    defaultChecked: { type: "boolean", label: "Checked by default", default: false },
    disabled: { type: "boolean", label: "Disabled", default: false },
  },
  texts: [{ key: "label", label: "Label text", kind: "text", default: "I accept the terms", propHint: "checkboxLabel" }],
  styleTargets: ["fg", "gap", "mt", "mb", "fontSize"],
  states: ["disabled"],
  imports: [{ from: "./ui/checkbox", named: ["Checkbox"] }],
  tpl: {
    el: "label",
    styled: true,
    classes: "flex items-center gap-2 text-sm",
    children: [{ el: "Checkbox", attrs: { defaultChecked: { prop: "defaultChecked" }, disabled: { prop: "disabled" } } }, { el: "span", children: [{ text: "label" }] }],
  },
};

export const card: BrickDefinition = {
  id: "shadcn.card",
  short: "card",
  family: "foundations",
  library: SHADCN(["ui/card.tsx"]),
  label: "Card",
  description: "shadcn/ui card with header, content and optional footer.",
  icon: "Square",
  keywords: ["card", "carte", "panneau", "tarif"],
  props: { size: { type: "enum", label: "Size", default: "default", options: variantOptions(["default", "sm"]) } },
  texts: [
    { key: "title", label: "Title", kind: "text", default: "Card title", propHint: "cardTitle" },
    { key: "description", label: "Description", kind: "text", default: "A short description.", propHint: "cardDescription" },
  ],
  slots: { children: { label: "Content", accepts: "any" }, footer: { label: "Footer", accepts: "any" } },
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "mt", "mb", "gap", "width", "maxWidth"],
  states: ["hover"],
  imports: [{ from: "./ui/card", named: ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"] }],
  tpl: {
    el: "Card",
    styled: true,
    attrs: { size: { prop: "size" } },
    children: [
      {
        el: "CardHeader",
        children: [
          { el: "CardTitle", children: [{ text: "title" }] },
          { ifText: "description", then: [{ el: "CardDescription", children: [{ text: "description" }] }] },
        ],
      },
      { el: "CardContent", classes: "flex flex-col gap-3", children: [{ slot: "children" }] },
      { ifSlot: "footer", then: [{ el: "CardFooter", classes: "gap-2", children: [{ slot: "footer" }] }] },
    ],
  },
};

export const dialog: BrickDefinition = {
  id: "shadcn.dialog",
  short: "dialog",
  family: "foundations",
  library: SHADCN(["ui/dialog.tsx"], ["radix-ui"]),
  label: "Dialog",
  description: "shadcn/ui modal window (Radix Dialog). Open it via its trigger or an interaction.",
  icon: "AppWindow",
  keywords: ["dialog", "modal", "modale", "popup", "fenêtre"],
  props: {
    defaultOpen: { type: "boolean", label: "Open by default", default: false },
    showCloseButton: { type: "boolean", label: "Close button", default: true },
  },
  texts: [
    { key: "title", label: "Title", kind: "text", default: "Confirm the action", propHint: "dialogTitle" },
    { key: "description", label: "Description", kind: "text", default: "This action can be undone at any time.", propHint: "dialogDescription" },
  ],
  slots: { trigger: { label: "Trigger", accepts: "inline", max: 1 }, content: { label: "Content", accepts: "any" } },
  styleTargets: ["bg", "fg", "borderColor", "radius", "shadow", "px", "py", "gap", "maxWidth"],
  states: [],
  state: { kind: "open", initialProp: "defaultOpen" },
  imports: [{ from: "./ui/dialog", named: ["Dialog", "DialogTrigger", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription"] }],
  tpl: {
    el: "Dialog",
    attrs: { open: { state: "value" }, onOpenChange: { state: "setter" } },
    children: [
      { ifSlot: "trigger", then: [{ el: "DialogTrigger", attrs: { asChild: { lit: true } }, children: [{ slot: "trigger" }] }] },
      {
        el: "DialogContent",
        styled: true,
        scope: true,
        attrs: { showCloseButton: { prop: "showCloseButton" } },
        children: [
          { el: "DialogHeader", children: [{ el: "DialogTitle", children: [{ text: "title" }] }, { el: "DialogDescription", children: [{ text: "description" }] }] },
          { slot: "content" },
        ],
      },
    ],
  },
  editTpl: {
    el: "div",
    classes: "flex flex-col gap-3",
    children: [
      { el: "div", classes: "forge-edit-caption", children: [{ staticText: "Dialog — edit preview (Interactive mode to open it)" }] },
      { el: "div", classes: "flex flex-wrap gap-2", children: [{ slot: "trigger" }] },
      {
        el: "div",
        styled: true,
        classes: "grid w-full gap-4 rounded-xl bg-(color:--popover) p-4 text-sm text-(color:--popover-foreground) ring-1 ring-(color:--foreground)/10 sm:max-w-sm",
        children: [
          { el: "div", classes: "flex flex-col gap-2", children: [{ el: "div", classes: "text-base font-medium", children: [{ text: "title" }] }, { el: "div", classes: "text-(color:--muted-foreground)", children: [{ text: "description" }] }] },
          { slot: "content" },
        ],
      },
    ],
  },
};

export const foundationsShadcn = [stack, grid, heading, text, button, input, textarea, label, badge, separator, switchField, checkbox, card, dialog];
