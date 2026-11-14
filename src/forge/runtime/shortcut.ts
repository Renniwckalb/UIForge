/**
 * Raccourcis clavier des briques (palette ⌘K…). Format : "mod+k", "mod+shift+p", "alt+/".
 * mod = ⌘ sur macOS/iOS, Ctrl ailleurs. Le même code est copié dans le composant exporté.
 */

export const SHORTCUT_HELPER_NAME = "matchesShortcut";

export const SHORTCUT_HELPER_SOURCE = `/** Keyboard shortcut ("mod+k", "mod+shift+p"…); mod = ⌘ on macOS, Ctrl elsewhere */
function matchesShortcut(e: KeyboardEvent, shortcut: string) {
  const parts = shortcut.toLowerCase().split("+").map((p) => p.trim());
  const key = parts.pop();
  const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);
  const mod = parts.includes("mod");
  return (
    e.key.toLowerCase() === key &&
    e.ctrlKey === (parts.includes("ctrl") || (mod && !isMac)) &&
    e.metaKey === (parts.includes("meta") || parts.includes("cmd") || (mod && isMac)) &&
    e.altKey === parts.includes("alt") &&
    e.shiftKey === parts.includes("shift")
  );
}`;

export function matchesShortcut(e: KeyboardEvent, shortcut: string) {
  const parts = shortcut.toLowerCase().split("+").map((p) => p.trim());
  const key = parts.pop();
  const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);
  const mod = parts.includes("mod");
  return (
    e.key.toLowerCase() === key &&
    e.ctrlKey === (parts.includes("ctrl") || (mod && !isMac)) &&
    e.metaKey === (parts.includes("meta") || parts.includes("cmd") || (mod && isMac)) &&
    e.altKey === parts.includes("alt") &&
    e.shiftKey === parts.includes("shift")
  );
}

/** Forme canonique pour comparer deux raccourcis ("Shift+Mod+K" ≡ "mod+shift+k") */
export function normalizeShortcut(s: string): string {
  const parts = s.toLowerCase().split("+").map((p) => p.trim()).filter(Boolean);
  const key = parts.pop() ?? "";
  const mods = [...new Set(parts.map((p) => (p === "cmd" ? "meta" : p)))].sort();
  return [...mods, key].join("+");
}

export function isValidShortcut(s: string): boolean {
  const parts = s.toLowerCase().split("+").map((p) => p.trim());
  if (parts.length < 1 || parts.some((p) => !p)) return false;
  const key = parts.pop()!;
  return key.length >= 1 && parts.every((p) => ["mod", "ctrl", "meta", "cmd", "alt", "shift"].includes(p));
}

export function formatShortcut(s: string): string {
  return s
    .split("+")
    .map((p) => ({ mod: "⌘/Ctrl", ctrl: "Ctrl", meta: "⌘", cmd: "⌘", alt: "Alt", shift: "Maj" })[p.trim().toLowerCase()] ?? p.trim().toUpperCase())
    .join(" + ");
}
