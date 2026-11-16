/**
 * Export Web Component côté serveur (API /api/export), sans navigateur.
 *
 * Next.js interdit react-dom/server dans les routes : ce module est donc compilé à part par
 * scripts/build-export-runtime.mts (esbuild → .forge/web-component-export.mjs, avec sa propre copie
 * de React) et chargé par la route au moment de l'appel. Il reprend export/snapshot.tsx, mais avec un
 * rendu statique (renderToStaticMarkup) au lieu d'un rendu dans le DOM.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentDoc } from "../model/types";
import { scopeClass } from "../codegen/css";
import { ComponentRenderer } from "../runtime/Renderer";
import { compileStandalone } from "../runtime/tailwind-runtime";
import { buildVanillaFiles, combinations, RUNTIME_CLASSES, variantPlan, type NodeVariants } from "./vanilla";
import { getLocale, setCurrentLocale, type Locale } from "../../i18n/core";
import { icons } from "lucide-react";
import { registerLucideIcons, type IconComponent } from "../runtime/icons";

// Rendu statique synchrone : toutes les icônes Lucide sont disponibles dès le chargement du module
registerLucideIcons(icons as unknown as Record<string, IconComponent>);

function render(doc: ComponentDoc) {
  return renderToStaticMarkup(<ComponentRenderer doc={doc} mode="export" scheme={doc.theme.defaultScheme} breakpoints="media" />).replace(/<style[\s\S]*?<\/style>/g, "");
}

function withLocale<T>(locale: Locale, fn: () => T): T {
  const prev = getLocale();
  setCurrentLocale(locale);
  try {
    return fn();
  } finally {
    setCurrentLocale(prev);
  }
}

/** Variantes pré-rendues des props exposées (même logique que snapshot.tsx, sans DOM) */
function renderVariants(doc: ComponentDoc): Record<string, NodeVariants> {
  const out: Record<string, NodeVariants> = {};
  const scope = scopeClass(doc);
  for (const plan of variantPlan(doc)) {
    const node = doc.nodes[plan.nodeId];
    const html: Record<string, string> = {};
    for (const combo of combinations(plan.props)) {
      const props = { ...node.props };
      plan.props.forEach((p, i) => (props[p.prop] = combo[i]));
      const sub: ComponentDoc = { ...doc, rootId: node.id, nodes: { ...doc.nodes, [node.id]: { ...node, parentId: null, props } } };
      // rendu ici comme racine : on retire les classes de portée de son premier élément
      const markup = render(sub).replace(/^(<[^>]*?\bclass=")([^"]*)"/, (_m, a: string, cls: string) => `${a}${cls.split(/\s+/).filter((c) => c && c !== scope && c !== "dark" && c !== "light" && c !== "auto").join(" ")}"`);
      if (markup) html[JSON.stringify(combo)] = markup;
    }
    if (Object.keys(html).length) out[node.id] = { props: plan.props.map((p) => p.propName), html };
  }
  return out;
}

export async function exportWebComponent(doc: ComponentDoc, locale: Locale) {
  const { html, variants } = withLocale(locale, () => ({ html: render(doc), variants: renderVariants(doc) }));
  const classes = new Set<string>(RUNTIME_CLASSES);
  for (const chunk of [html, ...Object.values(variants).flatMap((v) => Object.values(v.html))])
    for (const m of chunk.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && classes.add(c.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'")));
  const tailwindCss = await compileStandalone([...classes]);
  return withLocale(locale, () => buildVanillaFiles(doc, { html, tailwindCss, variants }));
}
