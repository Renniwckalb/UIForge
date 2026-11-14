import type { BrickDefinition, Family } from "./types";
import { foundationsShadcn } from "./defs/foundations";
import { foundationsPrimitives } from "./defs/primitives";
import { specialists } from "./defs/specialists";
import { designed } from "./defs/designed";

export const RAW_BRICK_ID = "raw.jsx";

/** Brique interne : JSX non reconnu par le parseur, conservé tel quel. */
export const rawBrick: BrickDefinition = {
  id: RAW_BRICK_ID,
  short: "raw",
  family: "foundations",
  library: { name: "Free code", url: "", npm: [] },
  label: "Unrecognized code",
  description: "JSX fragment kept as is (not visually editable).",
  icon: "Code",
  keywords: [],
  props: { code: { type: "string", label: "Code", default: "" } },
  texts: [],
  styleTargets: [],
  states: [],
  imports: [],
  tpl: { el: "div" },
};

export const ALL_BRICKS: BrickDefinition[] = [...foundationsShadcn, ...foundationsPrimitives, ...specialists, ...designed];

const byId = new Map<string, BrickDefinition>([...ALL_BRICKS, rawBrick].map((b) => [b.id, b]));
const byShort = new Map<string, BrickDefinition>([...ALL_BRICKS, rawBrick].map((b) => [b.short, b]));

export function getBrick(id: string): BrickDefinition {
  const b = byId.get(id);
  if (!b) throw new Error(`Unknown brick: ${id}`);
  return b;
}
export function findBrick(id: string): BrickDefinition | undefined {
  return byId.get(id);
}
export function brickByShort(short: string): BrickDefinition | undefined {
  return byShort.get(short);
}

export const FAMILIES: { id: Family; label: string; hint: string }[] = [
  { id: "foundations", label: "Foundations", hint: "Behavior + accessibility: shadcn/ui, Radix UI, Base UI" },
  { id: "specialists", label: "Specialists", hint: "Specialized: Drawer (Base UI), cmdk, NumberFlow" },
  { id: "designed", label: "Designed", hint: "Effects and sections: Magic UI" },
];

export function isContainer(b: BrickDefinition) {
  return !!b.slots && Object.keys(b.slots).length > 0;
}
