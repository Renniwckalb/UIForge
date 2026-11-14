import type { BrickDefinition } from "../types";

const RADIX = { name: "Radix UI", url: "https://www.radix-ui.com/primitives", npm: ["radix-ui", "lucide-react"] };
const BASE = (npm: string[]) => ({ name: "Base UI", url: "https://base-ui.com", npm });
const sideOptions = ["top", "right", "bottom", "left"].map((v) => ({ value: v, label: v }));

export const radixCollapsible: BrickDefinition = {
  id: "radix.collapsible",
  short: "collapsible",
  family: "foundations",
  library: RADIX,
  label: "Collapsible section",
  description: "Radix Collapsible: a clickable header that shows or hides its content.",
  icon: "ChevronsUpDown",
  keywords: ["collapsible", "accordéon", "faq", "replier", "radix"],
  props: { defaultOpen: { type: "boolean", label: "Open by default", default: false } },
  texts: [{ key: "trigger", label: "Header", kind: "text", default: "Show details", propHint: "toggleLabel" }],
  slots: { content: { label: "Content", accepts: "any" } },
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "px", "py", "mt", "mb", "gap", "width"],
  states: ["hover", "focus"],
  state: { kind: "open", initialProp: "defaultOpen" },
  imports: [{ from: "radix-ui", named: ["Collapsible"] }, { from: "lucide-react", named: ["ChevronDownIcon"] }],
  tpl: {
    el: "Collapsible.Root",
    styled: true,
    classes: "flex flex-col",
    attrs: { open: { state: "value" }, onOpenChange: { state: "setter" } },
    children: [
      {
        el: "Collapsible.Trigger",
        classes: "group flex w-full items-center justify-between gap-2 text-left text-sm font-medium",
        children: [{ el: "span", children: [{ text: "trigger" }] }, { el: "ChevronDownIcon", classes: "size-4 transition-transform group-data-[state=open]:rotate-180" }],
      },
      { el: "Collapsible.Content", classes: "flex flex-col gap-2 pt-3", children: [{ slot: "content" }] },
    ],
  },
  defaultStyle: { borderWidth: { value: "1px" }, borderColor: { token: "color.border" }, radius: { token: "radius.lg" }, px: { token: "space.4" }, py: { token: "space.3" } },
};

export const baseTooltip: BrickDefinition = {
  id: "baseui.tooltip",
  short: "tooltip",
  family: "foundations",
  library: BASE(["@base-ui/react"]),
  label: "Tooltip",
  description: "Base UI Tooltip: a trigger that shows a help bubble on hover or focus.",
  icon: "MessageSquareMore",
  keywords: ["tooltip", "infobulle", "aide", "hover", "base ui"],
  props: {
    side: { type: "enum", label: "Side", default: "top", options: sideOptions },
    sideOffset: { type: "number", label: "Offset (px)", default: 8, min: 0, max: 32, step: 1 },
  },
  texts: [
    { key: "trigger", label: "Trigger", kind: "text", default: "Hover me", propHint: "tooltipTrigger" },
    { key: "content", label: "Bubble content", kind: "text", default: "Additional information", propHint: "tooltipText" },
  ],
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "px", "py", "mt", "mb", "fontSize"],
  states: ["hover", "focus"],
  imports: [{ from: "@base-ui/react/tooltip", named: ["Tooltip"] }],
  tpl: {
    el: "Tooltip.Root",
    children: [
      { el: "Tooltip.Trigger", styled: true, classes: "inline-flex w-fit items-center text-sm font-medium", children: [{ text: "trigger" }] },
      {
        el: "Tooltip.Portal",
        children: [
          {
            el: "Tooltip.Positioner",
            attrs: { side: { prop: "side", always: true }, sideOffset: { prop: "sideOffset", always: true } },
            children: [
              {
                el: "Tooltip.Popup",
                scope: true,
                classes: "z-50 rounded-md bg-(color:--foreground) px-2.5 py-1.5 text-xs text-(color:--background) shadow-md",
                children: [{ text: "content" }],
              },
            ],
          },
        ],
      },
    ],
  },
  editTpl: {
    el: "div",
    classes: "flex flex-col items-start gap-2",
    children: [
      { el: "div", classes: "rounded-md bg-(color:--foreground) px-2.5 py-1.5 text-xs text-(color:--background) shadow-md", children: [{ text: "content" }] },
      { el: "span", styled: true, classes: "inline-flex w-fit items-center text-sm font-medium", children: [{ text: "trigger" }] },
    ],
  },
  defaultStyle: { borderWidth: { value: "1px" }, borderColor: { token: "color.border" }, radius: { token: "radius.md" }, px: { token: "space.3" }, py: { token: "space.2" } },
};

export const basePopover: BrickDefinition = {
  id: "baseui.popover",
  short: "popover",
  family: "foundations",
  library: BASE(["@base-ui/react"]),
  label: "Popover",
  description: "Base UI Popover: a floating panel anchored to its trigger.",
  icon: "PanelTopOpen",
  keywords: ["popover", "flottant", "menu", "base ui"],
  props: {
    defaultOpen: { type: "boolean", label: "Open by default", default: false },
    side: { type: "enum", label: "Side", default: "bottom", options: sideOptions },
    sideOffset: { type: "number", label: "Offset (px)", default: 8, min: 0, max: 32, step: 1 },
  },
  texts: [
    { key: "trigger", label: "Trigger", kind: "text", default: "Open", propHint: "popoverTrigger" },
    { key: "title", label: "Title", kind: "text", default: "Notifications", propHint: "popoverTitle" },
    { key: "description", label: "Description", kind: "text", default: "You're all caught up.", propHint: "popoverDescription" },
  ],
  slots: { content: { label: "Content", accepts: "any" } },
  styleTargets: ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "px", "py", "gap", "width"],
  states: [],
  state: { kind: "open", initialProp: "defaultOpen" },
  imports: [{ from: "@base-ui/react/popover", named: ["Popover"] }],
  tpl: {
    el: "Popover.Root",
    attrs: { open: { state: "value" }, onOpenChange: { state: "setter" } },
    children: [
      { el: "Popover.Trigger", classes: "inline-flex w-fit items-center rounded-md border border-(color:--border) px-3 py-1.5 text-sm font-medium", children: [{ text: "trigger" }] },
      {
        el: "Popover.Portal",
        children: [
          {
            el: "Popover.Positioner",
            attrs: { side: { prop: "side", always: true }, sideOffset: { prop: "sideOffset", always: true } },
            children: [
              {
                el: "Popover.Popup",
                styled: true,
                scope: true,
                classes: "z-50 flex flex-col outline-none",
                children: [
                  { el: "Popover.Title", classes: "text-sm font-medium", children: [{ text: "title" }] },
                  { el: "Popover.Description", classes: "text-sm text-(color:--muted-foreground)", children: [{ text: "description" }] },
                  { slot: "content" },
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
    classes: "flex flex-col items-start gap-2",
    children: [
      { el: "span", classes: "inline-flex w-fit items-center rounded-md border border-(color:--border) px-3 py-1.5 text-sm font-medium", children: [{ text: "trigger" }] },
      {
        el: "div",
        styled: true,
        classes: "flex flex-col",
        children: [
          { el: "div", classes: "text-sm font-medium", children: [{ text: "title" }] },
          { el: "div", classes: "text-sm text-(color:--muted-foreground)", children: [{ text: "description" }] },
          { slot: "content" },
        ],
      },
    ],
  },
  defaultStyle: {
    bg: { token: "color.popover" },
    fg: { token: "color.popover-foreground" },
    borderWidth: { value: "1px" },
    borderColor: { token: "color.border" },
    radius: { token: "radius.lg" },
    shadow: { token: "shadow.md" },
    px: { token: "space.4" },
    py: { token: "space.3" },
    gap: { token: "space.2" },
    width: { value: "18rem" },
  },
};

export const foundationsPrimitives = [radixCollapsible, baseTooltip, basePopover];
