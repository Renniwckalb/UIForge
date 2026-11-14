"use client";
/**
 * Compile à la volée (dans le navigateur) les classes Tailwind saisies à la main dans l'onglet Code,
 * pour qu'elles soient visibles sur le canvas : le CSS du studio est compilé au build et ne peut pas
 * les connaître. Utilise le compilateur officiel de Tailwind CSS v4 (paquet `tailwindcss`).
 */
import { compile } from "tailwindcss";
import { TAILWIND_PREFLIGHT_CSS, TAILWIND_THEME_CSS } from "../generated/tailwind-theme";

type Compiler = Awaited<ReturnType<typeof compile>>;
let compilerPromise: Promise<Compiler> | null = null;

function getCompiler() {
  compilerPromise ??= compile(`@import "tailwindcss/theme.css" layer(theme);\n@tailwind utilities;`, {
    base: "/",
    loadStylesheet: async (id: string, base: string) => ({ path: id, base, content: TAILWIND_THEME_CSS }),
  });
  return compilerPromise;
}

const cache = new Map<string, string>();

/** CSS des utilitaires correspondant aux classes données (chaîne vide si aucune) */
export async function compileClasses(classes: string[]): Promise<string> {
  const list = [...new Set(classes.filter(Boolean))].sort();
  if (!list.length) return "";
  const key = list.join(" ");
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  try {
    const compiler = await getCompiler();
    const css = compiler.build(list);
    cache.set(key, css);
    return css;
  } catch {
    return "";
  }
}

/* ——— Export HTML/CSS/JS : CSS autonome (thème + reset + utilitaires réellement utilisés) ——— */

let standalonePromise: Promise<Compiler> | null = null;

function getStandaloneCompiler() {
  standalonePromise ??= compile(
    `@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/preflight.css" layer(base);\n@tailwind utilities;`,
    {
      base: "/",
      loadStylesheet: async (id: string, base: string) => ({ path: id, base, content: id.includes("preflight") ? TAILWIND_PREFLIGHT_CSS : TAILWIND_THEME_CSS }),
    },
  );
  return standalonePromise;
}

/** CSS Tailwind complet pour une page autonome : variables du thème utilisées, preflight, utilitaires */
export async function compileStandalone(classes: string[]): Promise<string> {
  const list = [...new Set(classes.filter(Boolean))].sort();
  const compiler = await getStandaloneCompiler();
  return compiler.build(list);
}
