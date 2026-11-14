/** Modèles de départ proposés dans « Nouveau composant ». */
import { trValue } from "../../i18n/core";
import type { ComponentDoc, Node, NodeId } from "./types";
import { createEmptyDoc, createNode, insertNode } from "./ops";

type Builder = {
  doc: ComponentDoc;
  add: (brick: string, parent: NodeId, slot?: string, patch?: (n: Node) => void) => Node;
};

function builder(name: string): Builder {
  const doc = createEmptyDoc(name);
  return {
    doc,
    add(brick, parent, slot = "children", patch) {
      const n = createNode(doc, brick);
      patch?.(n);
      insertNode(doc, n, parent, slot, doc.nodes[parent].slots[slot]?.length ?? 0);
      return n;
    },
  };
}

/** Contenu par défaut écrit en anglais, créé dans la langue de l'interface */
const setText = (n: Node, key: string, value: string | string[], propName?: string) => {
  n.texts[key].value = trValue(value);
  if (propName) n.texts[key].propName = propName;
};

export type TemplateInfo = { id: string; label: string; description: string; libraries: string[]; build: () => ComponentDoc };

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "blank",
    label: "Blank canvas",
    description: "A root container, nothing else.",
    libraries: [],
    build: () => createEmptyDoc("MyComponent"),
  },
  {
    id: "pricing-card",
    label: "Pricing card",
    description: "shadcn/ui card with badge, price and call-to-action button.",
    libraries: ["shadcn/ui"],
    build: () => {
      const b = builder("PricingCard");
      const root = b.doc.nodes[b.doc.rootId];
      root.props.align = "center";
      const card = b.add("shadcn.card", root.id, "children", (n) => {
        setText(n, "title", "Pro", "title");
        setText(n, "description", "For teams that ship every week.", "description");
        n.style.base.maxWidth = { value: "22rem" };
        n.style.base.width = { value: "100%" };
        n.style.base.shadow = { token: "shadow.md" };
        n.style.hover = { shadow: { token: "shadow.lg" } };
        n.animation = { preset: "slide-up", on: "mount", durationMs: 450, delayMs: 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)", reducedMotion: "fade-only" };
      });
      b.add("shadcn.badge", card.id, "children", (n) => setText(n, "text", "Most popular", "badgeLabel"));
      b.add("html.heading", card.id, "children", (n) => {
        setText(n, "text", "$29 / month", "price");
        n.props.level = "3";
        n.style.base.fontSize = { token: "text.3xl" };
      });
      b.add("html.text", card.id, "children", (n) => setText(n, "text", "Unlimited projects, unlimited exports and priority support.", "features"));
      b.add("shadcn.button", card.id, "footer", (n) => {
        setText(n, "label", "Get started", "buttonLabel");
        n.style.base.width = { value: "100%" };
      });
      return b.doc;
    },
  },
  {
    id: "newsletter",
    label: "Newsletter signup",
    description: "Title, text, email field, checkbox and button.",
    libraries: ["shadcn/ui", "Radix UI"],
    build: () => {
      const b = builder("NewsletterSignup");
      const root = b.doc.nodes[b.doc.rootId];
      root.style.base.maxWidth = { value: "28rem" };
      root.style.base.bg = { token: "color.card" };
      root.style.base.radius = { token: "radius.xl" };
      root.style.base.borderWidth = { value: "1px" };
      root.style.base.borderColor = { token: "color.border" };
      root.style.base.gap = { token: "space.3" };
      b.add("html.heading", root.id, "children", (n) => setText(n, "text", "Stay in the loop", "title"));
      b.add("html.text", root.id, "children", (n) => setText(n, "text", "One email a month, no spam. Unsubscribe in one click.", "description"));
      b.add("shadcn.input", root.id, "children", (n) => setText(n, "placeholder", "you@example.com", "emailPlaceholder"));
      b.add("shadcn.checkbox", root.id, "children", (n) => setText(n, "label", "I agree to receive the newsletter", "consentLabel"));
      b.add("shadcn.button", root.id, "children", (n) => setText(n, "label", "Subscribe", "buttonLabel"));
      return b.doc;
    },
  },
  {
    id: "drawer-confirm",
    label: "Confirmation drawer",
    description: "A button that opens a Drawer containing a card and two actions.",
    libraries: ["shadcn/ui", "Vaul"],
    build: () => {
      const b = builder("ConfirmDrawer");
      const root = b.doc.nodes[b.doc.rootId];
      root.props.align = "start";
      const drawer = b.add("baseui.drawer", root.id, "children", (n) => {
        setText(n, "title", "Confirm the order", "title");
        setText(n, "description", "Check your cart before paying.", "description");
      });
      b.add("shadcn.button", drawer.id, "trigger", (n) => setText(n, "label", "Place order", "openLabel"));
      b.add("html.text", drawer.id, "content", (n) => setText(n, "text", "3 items · free shipping", "summary"));
      const actions = b.add("layout.stack", drawer.id, "content", (n) => {
        n.name = "Actions";
        n.props.direction = "row";
        n.props.justify = "end";
        n.style.base.gap = { token: "space.2" };
      });
      b.add("shadcn.button", actions.id, "children", (n) => {
        setText(n, "label", "Cancel", "cancelLabel");
        n.props.variant = "outline";
        n.interactions = [{ trigger: "click", action: { type: "close", target: drawer.id } }];
      });
      b.add("shadcn.button", actions.id, "children", (n) => {
        setText(n, "label", "Pay", "confirmLabel");
        n.interactions = [{ trigger: "click", action: { type: "close", target: drawer.id } }];
      });
      return b.doc;
    },
  },
  {
    id: "command-palette",
    label: "Command palette",
    description: "cmdk palette opened with ⌘K / Ctrl+K or a button.",
    libraries: ["cmdk", "shadcn/ui"],
    build: () => {
      const b = builder("CommandPalette");
      const root = b.doc.nodes[b.doc.rootId];
      root.props.align = "start";
      const palette = b.add("cmdk.dialog", root.id);
      b.add("shadcn.button", root.id, "children", (n) => {
        setText(n, "label", "Search…  ⌘K", "triggerLabel");
        n.props.variant = "outline";
        n.interactions = [{ trigger: "click", action: { type: "open", target: palette.id } }];
      });
      return b.doc;
    },
  },
  {
    id: "stat",
    label: "Animated stat",
    description: "NumberFlow number that animates on mount, with buttons to change the value.",
    libraries: ["NumberFlow", "shadcn/ui"],
    build: () => {
      const b = builder("AnimatedStat");
      const root = b.doc.nodes[b.doc.rootId];
      root.style.base.gap = { token: "space.2" };
      b.add("html.text", root.id, "children", (n) => setText(n, "text", "Monthly revenue", "label"));
      const num = b.add("numberflow.value", root.id, "children", (n) => {
        n.props.value = 48250;
        n.props.format = "currency-eur";
      });
      const row = b.add("layout.stack", root.id, "children", (n) => {
        n.name = "Actions";
        n.props.direction = "row";
        n.style.base.gap = { token: "space.2" };
        n.style.base.mt = { token: "space.2" };
      });
      b.add("shadcn.button", row.id, "children", (n) => {
        setText(n, "label", "Last month", "previousLabel");
        n.props.variant = "outline";
        n.props.size = "sm";
        n.interactions = [{ trigger: "click", action: { type: "setValue", target: num.id, value: 39120 } }];
      });
      b.add("shadcn.button", row.id, "children", (n) => {
        setText(n, "label", "This month", "currentLabel");
        n.props.size = "sm";
        n.interactions = [{ trigger: "click", action: { type: "setValue", target: num.id, value: 48250 } }];
      });
      return b.doc;
    },
  },
  {
    id: "hero",
    label: "Hero section",
    description: "Animated grid hero, rotating words and shimmer button (Magic UI), logo strip.",
    libraries: ["Magic UI", "shadcn/ui"],
    build: () => {
      const b = builder("HeroSection");
      const root = b.doc.nodes[b.doc.rootId];
      root.style.base.px = { token: "space.0" };
      root.style.base.py = { token: "space.0" };
      const hero = b.add("magicui.animated-grid", root.id, "children");
      hero.style.base.minHeight = { value: "28rem" };
      hero.style.base.gap = { token: "space.5" };
      b.add("shadcn.badge", hero.id, "children", (n) => {
        setText(n, "text", "New · v2 is out", "eyebrow");
        n.props.variant = "outline";
      });
      b.add("html.heading", hero.id, "children", (n) => {
        setText(n, "text", "Ship your interfaces", "title");
        n.props.level = "1";
        n.style.base.fontSize = { token: "text.5xl" };
        n.style.base.fontWeight = { value: "700" };
      });
      b.add("magicui.word-rotate", hero.id, "children", (n) => {
        setText(n, "words", ["faster.", "more simply.", "as a team."], "rotatingWords");
        n.style.base.fg = { token: "color.muted-foreground" };
      });
      b.add("html.text", hero.id, "children", (n) => {
        setText(n, "text", "Compose, customize and export production-ready React components.", "description");
        n.style.base.fg = { token: "color.muted-foreground" };
        n.style.base.fontSize = { token: "text.lg" };
        n.style.base.maxWidth = { value: "36rem" };
      });
      b.add("magicui.shimmer-button", hero.id, "children", (n) => {
        setText(n, "label", "Get started for free", "ctaLabel");
        n.style.base.mt = { token: "space.4" };
        n.interactions = [{ trigger: "click", action: { type: "navigate", href: "/signup" } }];
      });
      b.add("magicui.marquee", root.id, "children", (n) => {
        setText(n, "items", ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark"], "logos");
        n.style.base.py = { token: "space.6" };
      });
      return b.doc;
    },
  },
];

export function getTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id);
}
