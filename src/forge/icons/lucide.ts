/**
 * Icônes Lucide de la brique lucide.icon : noms connus, recherche et suggestions.
 * Module pur (seulement la liste générée des noms) : utilisable partout sans charger les icônes.
 */
import { LUCIDE_ICON_ALIASES, LUCIDE_ICON_NAMES } from "../generated/lucide-icons";

export { LUCIDE_ICON_ALIASES, LUCIDE_ICON_NAMES, LUCIDE_VERSION } from "../generated/lucide-icons";

const KNOWN = new Set(LUCIDE_ICON_NAMES);
/** Nom canonique d'une icône Lucide */
export const isLucideIcon = (name: string) => KNOWN.has(name);
/** Nom canonique d'un nom ou d'un ancien nom (Trash2 → Trash), sinon undefined */
export const canonicalIcon = (name: string): string | undefined => (KNOWN.has(name) ? name : Object.hasOwn(LUCIDE_ICON_ALIASES, name) ? LUCIDE_ICON_ALIASES[name] : undefined);

/** "ArrowDownAZ" → ["arrow", "down", "a", "z"] */
export function iconWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .toLowerCase()
    .split(" ");
}

/** Quelques synonymes courants (les noms Lucide sont en anglais et parfois peu intuitifs) */
const SYNONYMS: Record<string, string[]> = {
  delete: ["trash"],
  remove: ["trash", "x", "minus"],
  close: ["x"],
  cancel: ["x", "ban"],
  add: ["plus"],
  new: ["plus"],
  edit: ["pencil", "pen"],
  settings: ["settings", "cog"],
  config: ["settings", "cog"],
  person: ["user"],
  profile: ["user", "circle"],
  account: ["user"],
  email: ["mail"],
  message: ["message", "mail"],
  chat: ["message"],
  cart: ["shopping", "cart"],
  shop: ["store", "shopping"],
  money: ["banknote", "dollar", "wallet"],
  payment: ["credit", "card", "wallet"],
  success: ["check", "circle", "check"],
  ok: ["check"],
  done: ["check"],
  error: ["circle", "alert", "x"],
  warning: ["triangle", "alert"],
  info: ["info"],
  help: ["circle", "question"],
  menu: ["menu", "ellipsis"],
  more: ["ellipsis"],
  hamburger: ["menu"],
  next: ["arrow", "right", "chevron"],
  previous: ["arrow", "left", "chevron"],
  back: ["arrow", "left"],
  expand: ["chevron", "down", "maximize"],
  collapse: ["chevron", "up", "minimize"],
  home: ["house"],
  favorite: ["heart", "star"],
  like: ["heart", "thumbs"],
  location: ["map", "pin"],
  time: ["clock"],
  date: ["calendar"],
  photo: ["image", "camera"],
  picture: ["image"],
  video: ["video", "film"],
  music: ["music"],
  download: ["download"],
  upload: ["upload"],
  share: ["share"],
  link: ["link"],
  lock: ["lock"],
  security: ["shield", "lock"],
  notification: ["bell"],
  alert: ["bell", "alert"],
  dark: ["moon"],
  light: ["sun"],
  theme: ["sun", "moon"],
  logout: ["log", "out"],
  login: ["log", "in"],
  phone: ["phone", "smartphone"],
  mobile: ["smartphone"],
  computer: ["monitor", "laptop"],
  sparkle: ["sparkles"],
  magic: ["sparkles", "wand"],
  ai: ["sparkles", "bot", "brain"],
  rocket: ["rocket"],
  launch: ["rocket"],
  file: ["file"],
  document: ["file", "text"],
  folder: ["folder"],
  copy: ["copy"],
  refresh: ["refresh", "rotate"],
  reload: ["refresh", "rotate"],
  filter: ["funnel", "filter"],
  sort: ["arrow", "up", "down"],
  chart: ["chart"],
  graph: ["chart"],
  analytics: ["chart"],
  team: ["users"],
  people: ["users"],
  globe: ["globe", "earth"],
  language: ["languages", "globe"],
};

/** Score de pertinence d'une icône pour une requête (0 = aucune correspondance) */
function score(name: string, words: string[], terms: string[][]): number {
  const lower = name.toLowerCase();
  let total = 0;
  for (const alternatives of terms) {
    let best = 0;
    for (const t of alternatives) {
      if (!t) continue;
      if (words.includes(t)) best = Math.max(best, 3);
      else if (words.some((w) => w.startsWith(t))) best = Math.max(best, 2);
      else if (lower.includes(t)) best = Math.max(best, 1);
    }
    if (!best) return 0;
    total += best;
  }
  // noms courts d'abord à score égal (ArrowRight avant ArrowRightFromLine)
  return total * 100 - words.length;
}

/** Recherche d'icônes par mots (anglais, PascalCase ou kebab-case acceptés, quelques synonymes) */
export function searchIcons(query: string, limit = 60): string[] {
  const q = iconWords(query.trim().replace(/[^A-Za-z0-9]+/g, " ").replace(/\s+/g, " ")).join(" ").split(/\s+/).filter(Boolean);
  if (!q.length) return LUCIDE_ICON_NAMES.slice(0, limit);
  const exact = LUCIDE_ICON_NAMES.find((n) => n.toLowerCase() === query.trim().replace(/[-_\s]/g, "").toLowerCase());
  const terms = q.map((t) => [t, ...(SYNONYMS[t] ?? [])]);
  const ranked = LUCIDE_ICON_NAMES.map((n) => ({ n, s: score(n, iconWords(n), terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.n.localeCompare(b.n))
    .map((x) => x.n);
  // aucun résultat avec tous les mots : au moins un mot
  const out = ranked.length ? ranked : LUCIDE_ICON_NAMES.filter((n) => q.some((t) => iconWords(n).includes(t) || (SYNONYMS[t] ?? []).some((s) => iconWords(n).includes(s))));
  return [...new Set([...(exact ? [exact] : []), ...out])].slice(0, limit);
}

/** Distance d'édition (suggestions « vouliez-vous dire ») */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Candidats les plus proches d'un mot mal orthographié */
export function closest(word: string, candidates: readonly string[], n = 3): string[] {
  const w = word.toLowerCase();
  return candidates
    .map((c) => ({ c, s: c.toLowerCase().includes(w) || w.includes(c.toLowerCase()) ? 0 : editDistance(w, c.toLowerCase()) }))
    .sort((a, b) => a.s - b.s || a.c.length - b.c.length)
    .slice(0, n)
    .map((x) => x.c);
}

/** Suggestions pour un nom d'icône inconnu (orthographe proche, puis recherche par mots) */
export function suggestIcons(name: string, n = 5): string[] {
  const bare = name.replace(/[-_\s]|Icon$/g, "").toLowerCase();
  const normalized = LUCIDE_ICON_NAMES.find((x) => x.toLowerCase() === bare) ?? Object.entries(LUCIDE_ICON_ALIASES).find(([a]) => a.toLowerCase() === bare)?.[1];
  if (normalized) return [normalized];
  const byWords = searchIcons(name, n);
  const bySpelling = closest(name.replace(/Icon$/, ""), LUCIDE_ICON_NAMES.filter((x) => Math.abs(x.length - name.length) <= 3), n);
  return [...new Set([...byWords, ...bySpelling])].slice(0, n);
}
