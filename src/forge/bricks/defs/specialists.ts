import type { BrickDefinition, TplEl } from "../types";

// Vaul (emilkowalski/vaul) est déclaré non maintenu par son auteur (README, oct. 2025) : le Drawer repose sur Base UI.
const BASE_DRAWER = { name: "Base UI", url: "https://base-ui.com/react/components/drawer", npm: ["@base-ui/react"] };
const CMDK = { name: "cmdk", url: "https://cmdk.paco.me", npm: ["cmdk"] };
const NUMBERFLOW = { name: "NumberFlow", url: "https://number-flow.barvian.me", npm: ["@number-flow/react"] };

export const baseDrawer: BrickDefinition = {
  id: "baseui.drawer",
  short: "drawer",
  family: "specialists",
  library: BASE_DRAWER,
  label: "Drawer",
  description: "Base UI Drawer: sliding panel with a swipe-to-close gesture, ideal on mobile.",
  icon: "PanelBottom",
  keywords: ["drawer", "tiroir", "sheet", "panneau", "mobile", "base ui", "swipe"],
  props: {
    direction: { type: "enum", label: "Side", default: "bottom", exposable: true, options: ["bottom", "top", "left", "right"].map((v) => ({ value: v, label: v })) },
    modal: { type: "boolean", label: "Modal", default: true },
    defaultOpen: { type: "boolean", label: "Open by default", default: false },
    dismissible: { type: "boolean", label: "Close on outside click", default: true },
  },
  texts: [
    { key: "title", label: "Title", kind: "text", default: "Panel title", propHint: "drawerTitle" },
    { key: "description", label: "Description", kind: "text", default: "Swipe to close.", propHint: "drawerDescription" },
  ],
  slots: { trigger: { label: "Trigger", accepts: "inline", max: 1 }, content: { label: "Content", accepts: "any" } },
  styleTargets: ["bg", "fg", "borderColor", "radius", "shadow", "px", "py", "gap", "maxWidth"],
  states: [],
  state: { kind: "open", initialProp: "defaultOpen" },
  imports: [{ from: "@base-ui/react/drawer", named: ["Drawer"] }],
  tpl: {
    el: "Drawer.Root",
    attrs: {
      open: { state: "value" },
      onOpenChange: { state: "setter" },
      swipeDirection: { prop: "direction", mapObj: { bottom: null, top: "up", left: "left", right: "right" } },
      modal: { prop: "modal" },
      disablePointerDismissal: { prop: "dismissible", mapObj: { true: null, false: true } },
    },
    children: [
      { ifSlot: "trigger", then: [{ el: "span", classes: "contents", attrs: { onClick: { openState: true } }, children: [{ slot: "trigger" }] }] },
      {
        el: "Drawer.Portal",
        children: [
          { el: "Drawer.Backdrop", classes: "fixed inset-0 z-50 bg-black/40 transition-opacity duration-[400ms] data-starting-style:opacity-0 data-ending-style:opacity-0" },
          {
            el: "Drawer.Viewport",
            classes: "fixed inset-0 z-50 flex",
            classProps: { direction: { bottom: "items-end justify-center", top: "items-start justify-center", left: "items-stretch justify-start", right: "items-stretch justify-end" } },
            children: [
              {
                el: "Drawer.Popup",
                styled: true,
                scope: true,
                classes: "flex flex-col overflow-y-auto outline-none transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none",
                classProps: {
                  direction: {
                    bottom: "max-h-[85vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
                    top: "max-h-[85vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(-100%)] data-ending-style:[transform:translateY(-100%)]",
                    left: "h-full w-[min(24rem,90vw)] [transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)]",
                    right: "h-full w-[min(24rem,90vw)] [transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]",
                  },
                },
                children: [
                  { el: "Drawer.Title", classes: "text-lg font-semibold", children: [{ text: "title" }] },
                  { el: "Drawer.Description", classes: "text-sm text-(color:--muted-foreground)", children: [{ text: "description" }] },
                  { el: "div", classes: "flex flex-col gap-3", children: [{ slot: "content" }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  editTpl: {
    el: "div",
    classes: "flex flex-col gap-3",
    children: [
      { el: "div", classes: "forge-edit-caption", children: [{ staticText: "Drawer — edit preview (Interactive mode to open and swipe it)" }] },
      { el: "div", classes: "flex flex-wrap gap-2", children: [{ slot: "trigger" }] },
      {
        el: "div",
        styled: true,
        classes: "flex w-full flex-col",
        children: [
          { el: "div", classes: "text-lg font-semibold", children: [{ text: "title" }] },
          { el: "div", classes: "text-sm text-(color:--muted-foreground)", children: [{ text: "description" }] },
          { el: "div", classes: "flex flex-col gap-3", children: [{ slot: "content" }] },
        ],
      },
    ],
  },
  defaultStyle: {
    bg: { token: "color.background" },
    fg: { token: "color.foreground" },
    radius: { token: "radius.xl" },
    px: { token: "space.6" },
    py: { token: "space.6" },
    gap: { token: "space.3" },
    maxWidth: { value: "40rem" },
  },
};

const commandItems: TplEl = {
  el: "Command.List",
  classes: "max-h-72 overflow-y-auto p-2",
  children: [
    { el: "Command.Empty", classes: "py-6 text-center text-sm text-(color:--muted-foreground)", children: [{ text: "empty" }] },
    {
      el: "Command.Group",
      attrs: { heading: { text: "group" } },
      classes: "text-sm [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-(color:--muted-foreground)",
      children: [
        {
          list: "items",
          item: {
            el: "Command.Item",
            classes: "flex cursor-default items-center rounded-md px-2 py-2 outline-none data-[selected=true]:bg-(color:--accent) data-[selected=true]:text-(color:--accent-foreground)",
            children: [{ itemText: true }],
          },
        },
      ],
    },
  ],
};
const commandInput: TplEl = {
  el: "Command.Input",
  classes: "w-full border-b border-(color:--border) bg-transparent px-4 py-3 text-sm outline-none placeholder:text-(color:--muted-foreground)",
  attrs: { placeholder: { text: "placeholder" } },
};

const commandTexts = [
  { key: "title", label: "Accessible title", kind: "text" as const, default: "Command palette", propHint: "paletteLabel" },
  { key: "placeholder", label: "Placeholder", kind: "text" as const, default: "Search for a command…", propHint: "searchPlaceholder" },
  { key: "empty", label: "No results", kind: "text" as const, default: "No results.", propHint: "emptyLabel" },
  { key: "group", label: "Group heading", kind: "text" as const, default: "Suggestions", propHint: "groupHeading" },
  { key: "items", label: "Commands", kind: "list" as const, default: ["New document", "Search files", "Settings", "Sign out"], propHint: "commands" },
];

const commandStyle = {
  bg: { token: "color.popover" },
  fg: { token: "color.popover-foreground" },
  borderWidth: { value: "1px" },
  borderColor: { token: "color.border" },
  radius: { token: "radius.xl" },
  shadow: { token: "shadow.lg" },
} as const;

export const cmdkPalette: BrickDefinition = {
  id: "cmdk.dialog",
  short: "palette",
  family: "specialists",
  library: CMDK,
  label: "⌘K palette",
  description: "cmdk: command palette in a window, opened with ⌘K / Ctrl+K, instant filtering.",
  icon: "Command",
  keywords: ["cmdk", "command", "palette", "recherche", "raccourci", "ctrl k"],
  props: {
    defaultOpen: { type: "boolean", label: "Open by default", default: false },
    shortcut: { type: "string", label: "Shortcut", default: "mod+k", help: "Format: mod+k, mod+shift+p, alt+/ — mod = ⌘ on macOS, Ctrl elsewhere" },
    enableShortcut: { type: "boolean", label: "Shortcut enabled", default: true, exposable: true },
  },
  exposeByDefault: ["shortcut", "enableShortcut"],
  texts: commandTexts,
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "maxWidth"],
  states: [],
  state: { kind: "open", initialProp: "defaultOpen" },
  effect: { kind: "hotkey", shortcutProp: "shortcut", enableProp: "enableShortcut", action: "toggle" },
  imports: [{ from: "cmdk", named: ["Command"] }],
  tpl: {
    el: "Command.Dialog",
    styled: true,
    scope: true,
    classAttr: "contentClassName",
    classes: "fixed left-1/2 top-[15vh] z-50 w-[min(32rem,92vw)] -translate-x-1/2 overflow-hidden",
    attrs: {
      open: { state: "value" },
      onOpenChange: { state: "setter" },
      label: { text: "title" },
      overlayClassName: { lit: "fixed inset-0 z-50 bg-black/40" },
    },
    children: [commandInput, commandItems],
  },
  editTpl: {
    el: "div",
    classes: "flex flex-col gap-2",
    children: [
      { el: "div", classes: "forge-edit-caption", children: [{ staticText: "⌘K palette — edit preview (Interactive mode: ⌘K / Ctrl+K)" }] },
      { el: "Command", styled: true, classes: "w-full overflow-hidden", children: [commandInput, commandItems] },
    ],
  },
  defaultStyle: { ...commandStyle, maxWidth: { value: "32rem" } },
};

export const cmdkMenu: BrickDefinition = {
  id: "cmdk.menu",
  short: "command",
  family: "specialists",
  library: CMDK,
  label: "Command menu",
  description: "cmdk: filterable list shown inline (no window). The shortcut puts the cursor in the search.",
  icon: "SquareTerminal",
  keywords: ["cmdk", "command", "menu", "liste", "filtre", "recherche"],
  props: {
    shortcut: { type: "string", label: "Shortcut", default: "mod+k", help: "Format: mod+k, mod+shift+p, alt+/ — mod = ⌘ on macOS, Ctrl elsewhere" },
    enableShortcut: { type: "boolean", label: "Shortcut enabled", default: true, exposable: true },
  },
  exposeByDefault: ["shortcut", "enableShortcut"],
  effect: { kind: "hotkey", shortcutProp: "shortcut", enableProp: "enableShortcut", action: "focus" },
  texts: commandTexts.filter((t) => t.key !== "title"),
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "mt", "mb", "width", "maxWidth"],
  states: [],
  imports: [{ from: "cmdk", named: ["Command"] }],
  tpl: { el: "Command", styled: true, classes: "w-full overflow-hidden", children: [{ ...commandInput, attrs: { ...commandInput.attrs, ref: { inputRef: true } } }, commandItems] },
  defaultStyle: commandStyle,
};

export const numberFlow: BrickDefinition = {
  id: "numberflow.value",
  short: "number",
  family: "specialists",
  library: NUMBERFLOW,
  label: "Animated number",
  description: "NumberFlow: a number that animates on every value change (“change a value” interactions).",
  icon: "Hash",
  keywords: ["number", "chiffre", "compteur", "stat", "prix", "animation", "numberflow"],
  props: {
    value: { type: "number", label: "Value", default: 1280, min: -1000000, max: 100000000, step: 1 },
    from: { type: "number", label: "Animate from", default: 0, min: -1000000, max: 100000000, step: 1, help: "Value shown on mount, then animated to “Value”." },
    animateOnMount: { type: "boolean", label: "Animate on mount", default: true },
    locale: { type: "enum", label: "Language", default: "fr-FR", options: [{ value: "fr-FR", label: "French" }, { value: "en-US", label: "English (US)" }, { value: "de-DE", label: "German" }] },
    format: {
      type: "enum",
      label: "Format",
      default: "decimal",
      options: [
        { value: "decimal", label: "Number" },
        { value: "currency-eur", label: "Euros" },
        { value: "currency-usd", label: "Dollars" },
        { value: "percent", label: "Percentage" },
        { value: "compact", label: "Compact (1.2K)" },
      ],
    },
  },
  texts: [
    { key: "prefix", label: "Prefix", kind: "text", default: "", propHint: "valuePrefix" },
    { key: "suffix", label: "Suffix", kind: "text", default: "", propHint: "valueSuffix" },
  ],
  styleTargets: ["fg", "mt", "mb", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign"],
  states: [],
  state: { kind: "value", initialProp: "value", fromProp: "from" },
  effect: { kind: "animateValue", delayMs: 250 },
  imports: [{ from: "@number-flow/react", default: "NumberFlow" }],
  tpl: {
    el: "span",
    styled: true,
    classes: "inline-block tabular-nums",
    children: [
      {
        el: "NumberFlow",
        attrs: {
          value: { state: "value" },
          format: {
            prop: "format",
            mapObj: {
              decimal: null,
              "currency-eur": { style: "currency", currency: "EUR", maximumFractionDigits: 0 },
              "currency-usd": { style: "currency", currency: "USD", maximumFractionDigits: 0 },
              percent: { style: "percent", maximumFractionDigits: 1 },
              compact: { notation: "compact", maximumFractionDigits: 1 },
            },
          },
          locales: { prop: "locale", always: true },
          prefix: { text: "prefix" },
          suffix: { text: "suffix" },
        },
      },
    ],
  },
  defaultStyle: { fontSize: { token: "text.4xl" }, fontWeight: { value: "600" }, lineHeight: { value: "1.1" } },
};

export const specialists = [baseDrawer, cmdkPalette, cmdkMenu, numberFlow];
