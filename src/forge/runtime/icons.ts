/**
 * Composants des icônes Lucide (brique lucide.icon), chargés à la demande.
 *
 * Les 2 000+ icônes pèsent plusieurs centaines de Ko : le studio ne les charge (en un seul bloc) que
 * lorsqu'un composant en contient une ou que le sélecteur s'ouvre. Le rendu serveur de l'export
 * Web Component les enregistre au démarrage (registerLucideIcons), puisque son rendu est synchrone.
 */
import type { ComponentType } from "react";
import type { ComponentDoc } from "../model/types";
import { ICON_BRICK_ID } from "../bricks/defs/icon";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = ComponentType<any>;
type Registry = Record<string, IconComponent>;

let registry: Registry | null = null;
let loading: Promise<Registry> | null = null;
const listeners = new Set<() => void>();

export function registerLucideIcons(icons: Registry) {
  registry = icons;
  listeners.forEach((l) => l());
}

/** Charge toutes les icônes (une seule fois) */
export function loadLucideIcons(): Promise<Registry> {
  if (registry) return Promise.resolve(registry);
  loading ??= import("lucide-react").then((m) => {
    registerLucideIcons(m.icons as unknown as Registry);
    return registry!;
  });
  return loading;
}

export const getLucideIcon = (name: string): IconComponent | undefined => registry?.[name];
export const lucideIconsLoaded = () => registry !== null;

export function subscribeLucideIcons(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export const docUsesIcons = (doc: ComponentDoc) => Object.values(doc.nodes).some((n) => n.brick === ICON_BRICK_ID);

/** À appeler avant un rendu statique (instantané d'export, capture) d'un composant qui contient des icônes */
export async function preloadIconsFor(doc: ComponentDoc) {
  if (docUsesIcons(doc)) await loadLucideIcons();
}
