/**
 * Internationalisation : l'anglais est la langue source. Chaque texte de l'interface est écrit en anglais
 * dans le code et traduit par `translate()` à partir des dictionnaires messages/<langue>.json
 * (clé = texte anglais). Un texte absent d'un dictionnaire reste en anglais.
 *
 * Paramètres : "Delete {name}?" + { name: "Card" } → "Supprimer Card ?"
 *
 * Ce module est pur (pas de React) : utilisable dans le générateur de code, l'export et les tests.
 */
import fr from "./messages/fr.json";
import zh from "./messages/zh.json";

export const LOCALES = ["en", "fr", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

/** Nom de chaque langue dans sa propre langue (sélecteur) */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", fr: "Français", zh: "中文" };
/** Balise BCP 47 (attribut lang, Intl) */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en", fr: "fr", zh: "zh-CN" };

export const DICTIONARIES: Record<Exclude<Locale, "en">, Record<string, string>> = { fr, zh };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export type TParams = Record<string, string | number>;

/** Langue courante pour le code hors React (générateur, export, création de nœuds). */
let current: Locale = DEFAULT_LOCALE;
export function getLocale(): Locale {
  return current;
}
export function setCurrentLocale(l: Locale) {
  current = l;
}

function interpolate(s: string, params?: TParams) {
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

export function translate(locale: Locale, text: string, params?: TParams): string {
  const s = locale === "en" ? text : (DICTIONARIES[locale][text] ?? text);
  return interpolate(s, params);
}

/** Traduit dans la langue courante (code hors React). Dans un composant, utiliser useT(). */
export function tr(text: string, params?: TParams): string {
  return translate(current, text, params);
}

/** Traduit une liste (valeurs par défaut des champs de type liste) */
export function trValue<T extends string | string[]>(v: T, locale: Locale = current): T {
  return (Array.isArray(v) ? v.map((x) => translate(locale, x)) : translate(locale, v)) as T;
}

/**
 * Nom d'élément affiché (calques, glisser-déposer) : les noms automatiques sont stockés en anglais
 * ("Card 1", "Root") et traduits à l'affichage ; un nom saisi par l'utilisateur reste tel quel.
 */
export function translateNodeName(locale: Locale, name: string): string {
  const m = name.match(/^(.+?)( \d+)?( \(copy\))?$/);
  if (!m) return name;
  return translate(locale, m[1]) + (m[2] ?? "") + (m[3] ? ` (${translate(locale, "copy")})` : "");
}
