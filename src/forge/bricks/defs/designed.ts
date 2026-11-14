import type { BrickDefinition } from "../types";

const MAGIC = (file: string) => ({ name: "Magic UI", url: "https://magicui.design", npm: [], vendored: [`ui/${file}.tsx`] });

const sectionStyleTargets = ["bg", "fg", "borderColor", "borderWidth", "radius", "shadow", "px", "py", "gap", "mt", "mb", "width", "maxWidth", "minHeight", "textAlign"] as BrickDefinition["styleTargets"];

export const shimmerButton: BrickDefinition = {
  id: "magicui.shimmer-button",
  short: "shimmer",
  family: "designed",
  library: MAGIC("shimmer-button"),
  label: "Shimmer button",
  description: "Magic UI Shimmer Button: a light shimmer rotates around the button.",
  icon: "Sparkles",
  keywords: ["shimmer", "bouton", "cta", "brillant", "magic ui"],
  props: {
    shimmerDuration: { type: "enum", label: "Speed", default: "3s", options: [{ value: "5s", label: "Slow" }, { value: "3s", label: "Normal" }, { value: "1.5s", label: "Fast" }] },
  },
  texts: [{ key: "label", label: "Label text", kind: "text", default: "Get started for free", propHint: "ctaLabel" }],
  styleTargets: ["fg", "px", "py", "mt", "mb", "fontSize", "fontWeight", "width"],
  states: ["hover", "active"],
  clickable: true,
  imports: [{ from: "./ui/shimmer-button", named: ["ShimmerButton"] }],
  tpl: {
    el: "ShimmerButton",
    styled: true,
    attrs: {
      background: { lit: "var(--primary)" },
      shimmerColor: { lit: "var(--primary-foreground)" },
      borderRadius: { lit: "var(--radius-2xl)" },
      shimmerDuration: { prop: "shimmerDuration" },
      onClick: { onClick: true },
    },
    children: [{ el: "span", classes: "relative z-10", children: [{ text: "label" }] }],
  },
  defaultStyle: { fg: { token: "color.primary-foreground" }, fontWeight: { value: "500" } },
};

export const borderBeamCard: BrickDefinition = {
  id: "magicui.border-beam",
  short: "beam",
  family: "designed",
  library: MAGIC("border-beam"),
  label: "Border beam frame",
  description: "Magic UI Border Beam: a light beam travels along the container's border.",
  icon: "Frame",
  keywords: ["border", "beam", "faisceau", "carte", "cadre", "magic ui"],
  props: {
    duration: { type: "number", label: "Loop duration (s)", default: 6, min: 2, max: 20, step: 1 },
    size: { type: "number", label: "Beam length", default: 80, min: 20, max: 300, step: 10 },
    reverse: { type: "boolean", label: "Reverse", default: false },
  },
  texts: [],
  slots: { children: { label: "Content", accepts: "any" } },
  styleTargets: sectionStyleTargets,
  states: ["hover"],
  imports: [{ from: "./ui/border-beam", named: ["BorderBeam"] }],
  tpl: {
    el: "div",
    styled: true,
    classes: "relative flex flex-col overflow-hidden",
    children: [
      { slot: "children" },
      {
        el: "BorderBeam",
        attrs: {
          duration: { prop: "duration", always: true },
          size: { prop: "size", always: true },
          reverse: { prop: "reverse" },
          colorFrom: { lit: "var(--primary)" },
          colorTo: { lit: "var(--muted-foreground)" },
        },
      },
    ],
  },
  defaultStyle: {
    bg: { token: "color.card" },
    borderWidth: { value: "1px" },
    borderColor: { token: "color.border" },
    radius: { token: "radius.xl" },
    px: { token: "space.6" },
    py: { token: "space.6" },
    gap: { token: "space.3" },
  },
};

export const dotPatternSection: BrickDefinition = {
  id: "magicui.dot-pattern",
  short: "dots",
  family: "designed",
  library: MAGIC("dot-pattern"),
  label: "Dot background",
  description: "Magic UI Dot Pattern: section with a (optionally glowing) dot pattern background.",
  icon: "Grid3x3",
  keywords: ["dot", "pattern", "points", "fond", "background", "hero", "magic ui"],
  props: {
    spacing: { type: "number", label: "Dot spacing", default: 20, min: 8, max: 48, step: 2 },
    glow: { type: "boolean", label: "Glowing dots", default: false },
    fade: { type: "boolean", label: "Radial fade", default: true },
  },
  texts: [],
  slots: { children: { label: "Content", accepts: "any" } },
  styleTargets: sectionStyleTargets,
  states: [],
  imports: [{ from: "./ui/dot-pattern", named: ["DotPattern"] }],
  tpl: {
    el: "div",
    styled: true,
    classes: "relative flex flex-col overflow-hidden",
    children: [
      {
        el: "DotPattern",
        classes: "text-(color:--muted-foreground)/40",
        classProps: { fade: { true: "[mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]", false: "" } },
        attrs: { width: { prop: "spacing", always: true }, height: { prop: "spacing", always: true }, glow: { prop: "glow" } },
      },
      { el: "div", classes: "relative z-10 flex w-full flex-col items-center gap-[inherit]", children: [{ slot: "children" }] },
    ],
  },
  defaultStyle: { px: { token: "space.8" }, py: { token: "space.16" }, gap: { token: "space.4" }, textAlign: { value: "center" } },
};

export const marquee: BrickDefinition = {
  id: "magicui.marquee",
  short: "marquee",
  family: "designed",
  library: MAGIC("marquee"),
  label: "Marquee",
  description: "Magic UI Marquee: a continuously scrolling strip of texts (logos, testimonials…).",
  icon: "Columns3",
  keywords: ["marquee", "défilement", "logos", "bande", "carrousel", "magic ui"],
  props: {
    pauseOnHover: { type: "boolean", label: "Pause on hover", default: true },
    reverse: { type: "boolean", label: "Reverse", default: false },
    speed: { type: "enum", label: "Speed", default: "normal", options: [{ value: "slow", label: "Slow" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Fast" }] },
  },
  texts: [{ key: "items", label: "Items", kind: "list", default: ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark"], propHint: "marqueeItems" }],
  styleTargets: ["bg", "fg", "radius", "py", "mt", "mb", "fontSize", "fontWeight", "width"],
  states: [],
  imports: [{ from: "./ui/marquee", named: ["Marquee"] }],
  tpl: {
    el: "Marquee",
    styled: true,
    classProps: { speed: { slow: "[--duration:60s]", normal: "", fast: "[--duration:15s]" } },
    attrs: { pauseOnHover: { prop: "pauseOnHover", always: true }, reverse: { prop: "reverse" } },
    children: [{ list: "items", item: { el: "span", classes: "mx-6 whitespace-nowrap", children: [{ itemText: true }] } }],
  },
  defaultStyle: { fg: { token: "color.muted-foreground" }, fontSize: { token: "text.lg" }, fontWeight: { value: "600" } },
};

export const wordRotate: BrickDefinition = {
  id: "magicui.word-rotate",
  short: "rotate",
  family: "designed",
  library: MAGIC("word-rotate"),
  label: "Rotating words",
  description: "Magic UI Word Rotate: words that replace each other in a loop, animated.",
  icon: "Type",
  keywords: ["word", "rotate", "mots", "titre", "animation", "hero", "magic ui"],
  props: { duration: { type: "number", label: "Duration per word (ms)", default: 2200, min: 800, max: 6000, step: 100 } },
  texts: [{ key: "words", label: "Words", kind: "list", default: ["faster", "simpler", "together"], propHint: "rotatingWords" }],
  styleTargets: ["fg", "mt", "mb", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign"],
  states: [],
  imports: [{ from: "./ui/word-rotate", named: ["WordRotate"] }],
  tpl: { el: "div", styled: true, children: [{ el: "WordRotate", attrs: { words: { text: "words" }, duration: { prop: "duration", always: true } } }] },
  defaultStyle: { fontSize: { token: "text.4xl" }, fontWeight: { value: "700" }, lineHeight: { value: "1.1" }, fontFamily: { token: "font.heading" } },
};

export const gridHero: BrickDefinition = {
  id: "magicui.animated-grid",
  short: "gridhero",
  family: "designed",
  library: MAGIC("animated-grid-pattern"),
  label: "Animated grid hero",
  description: "Magic UI Animated Grid Pattern: hero section whose background grid lights up square by square.",
  icon: "Spotlight",
  keywords: ["grid", "grille", "hero", "section", "fond", "background", "animation", "magic ui"],
  props: {
    numSquares: { type: "number", label: "Animated squares", default: 30, min: 5, max: 120, step: 5 },
    duration: { type: "number", label: "Cycle duration (s)", default: 3, min: 1, max: 10, step: 1 },
    maxOpacity: { type: "number", label: "Max intensity", default: 0.15, min: 0.05, max: 1, step: 0.05 },
    fade: { type: "boolean", label: "Radial fade", default: true },
  },
  texts: [],
  slots: { children: { label: "Content", accepts: "any" } },
  styleTargets: sectionStyleTargets,
  states: [],
  imports: [{ from: "./ui/animated-grid-pattern", named: ["AnimatedGridPattern"] }],
  tpl: {
    el: "section",
    styled: true,
    classes: "relative flex flex-col items-center justify-center overflow-hidden",
    children: [
      {
        el: "AnimatedGridPattern",
        classes: "inset-0 h-full text-(color:--muted-foreground)",
        classProps: { fade: { true: "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]", false: "" } },
        attrs: {
          numSquares: { prop: "numSquares", always: true },
          duration: { prop: "duration", always: true },
          maxOpacity: { prop: "maxOpacity", always: true },
        },
      },
      { el: "div", classes: "relative z-10 flex w-full flex-col items-center gap-[inherit]", children: [{ slot: "children" }] },
    ],
  },
  defaultStyle: {
    bg: { token: "color.background" },
    borderWidth: { value: "1px" },
    borderColor: { token: "color.border" },
    radius: { token: "radius.2xl" },
    px: { token: "space.8" },
    py: { token: "space.24" },
    gap: { token: "space.4" },
    textAlign: { value: "center" },
  },
};

export const textAnimate: BrickDefinition = {
  id: "magicui.text-animate",
  short: "textfx",
  family: "designed",
  library: MAGIC("text-animate"),
  label: "Animated text",
  description: "Magic UI Text Animate: text appears word by word (or letter by letter) with an effect of your choice.",
  icon: "LetterText",
  keywords: ["text", "animate", "apparition", "mots", "titre", "magic ui"],
  props: {
    animation: {
      type: "enum",
      label: "Effect",
      default: "blurInUp",
      options: [
        { value: "fadeIn", label: "Fade" },
        { value: "blurInUp", label: "Blur in up" },
        { value: "slideUp", label: "Slide up" },
        { value: "scaleUp", label: "Zoom" },
      ],
    },
    by: { type: "enum", label: "Split by", default: "word", options: [{ value: "word", label: "Word" }, { value: "character", label: "Letter" }, { value: "line", label: "Line" }] },
    duration: { type: "number", label: "Total duration (s)", default: 0.6, min: 0.2, max: 3, step: 0.1 },
    once: { type: "boolean", label: "Only once", default: true },
  },
  texts: [{ key: "words", label: "Text", kind: "text", default: "Build interfaces your users love.", propHint: "headline", multiline: true }],
  styleTargets: ["fg", "mt", "mb", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign", "maxWidth"],
  states: [],
  imports: [{ from: "./ui/text-animate", named: ["TextAnimate"] }],
  tpl: {
    el: "div",
    styled: true,
    children: [
      {
        el: "TextAnimate",
        attrs: {
          animation: { prop: "animation", always: true },
          by: { prop: "by", always: true },
          duration: { prop: "duration", always: true },
          once: { prop: "once", always: true },
        },
        children: [{ text: "words" }],
      },
    ],
  },
  defaultStyle: { fontSize: { token: "text.3xl" }, fontWeight: { value: "700" }, lineHeight: { value: "1.2" }, fontFamily: { token: "font.heading" } },
};

export const designed: BrickDefinition[] = [shimmerButton, borderBeamCard, dotPatternSection, marquee, wordRotate, gridHero, textAnimate];
