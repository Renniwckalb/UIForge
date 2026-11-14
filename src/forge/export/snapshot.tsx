"use client";
/**
 * Instantané du composant pour l'export HTML/CSS/JS : rendu hors écran en mode "export",
 * capture du balisage, puis compilation Tailwind des seules classes présentes.
 */
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { ComponentDoc } from "../model/types";
import { scopeClass } from "../codegen/css";
import { ComponentRenderer } from "../runtime/Renderer";
import { compileStandalone } from "../runtime/tailwind-runtime";
import { buildVanillaFiles, combinations, RUNTIME_CLASSES, variantPlan, type NodeVariants, type VanillaSnapshot } from "./vanilla";

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export async function snapshotDoc(doc: ComponentDoc): Promise<VanillaSnapshot> {
  const scheme = doc.theme.defaultScheme;
  const host = document.createElement("div");
  // Dans la fenêtre (les observateurs d'intersection se déclenchent) mais invisible et inerte
  host.style.cssText = "position:fixed;left:0;top:0;width:1280px;opacity:0;pointer-events:none;z-index:-1;";
  host.setAttribute("aria-hidden", "true");
  host.inert = true;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    // hors du cycle de rendu en cours (appelé depuis un effet) : flushSync est alors autorisé
    await wait(0);
    flushSync(() => root.render(<ComponentRenderer doc={doc} mode="export" scheme={scheme} breakpoints="media" />));
    // Laisse les bibliothèques poser leurs attributs (ids, data-state, mesures cmdk) et les animations se terminer
    await wait(Object.values(doc.nodes).some((n) => n.brick.startsWith("magicui.")) ? 1200 : 150);

    const clone = host.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("style, script").forEach((el) => el.remove());
    // Texte animé : le runtime rejoue l'animation, on retire l'état intermédiaire de motion
    clone.querySelectorAll('[data-fx-brick="magicui.text-animate"] [style]').forEach((el) => el.removeAttribute("style"));
    clone.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));

    const classes = new Set<string>(RUNTIME_CLASSES);
    const collect = (el: Element) =>
      [el, ...el.querySelectorAll("[class]")].forEach((x) => (x.getAttribute("class") ?? "").split(/\s+/).forEach((c) => c && classes.add(c)));
    collect(clone);
    const variants = renderVariants(doc, root, host);
    for (const v of Object.values(variants)) {
      for (const html of Object.values(v.html)) {
        const t = document.createElement("template");
        t.innerHTML = html;
        if (t.content.firstElementChild) collect(t.content.firstElementChild);
      }
    }
    const tailwindCss = await compileStandalone([...classes]);
    // Balisage conservé tel quel : reformater changerait les espaces entre éléments en ligne
    return { html: `    ${clone.innerHTML}`, tailwindCss, variants };
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Props exposées qui changent le balisage (variante, taille, désactivé, chargement…) : chaque combinaison
 * du nœud est rendue une fois, le runtime échange ensuite le nœud quand la prop change.
 */
function renderVariants(doc: ComponentDoc, root: ReturnType<typeof createRoot>, host: HTMLElement): Record<string, NodeVariants> {
  const out: Record<string, NodeVariants> = {};
  const scope = scopeClass(doc);
  for (const plan of variantPlan(doc)) {
    const node = doc.nodes[plan.nodeId];
    const html: Record<string, string> = {};
    for (const combo of combinations(plan.props)) {
      const props = { ...node.props };
      plan.props.forEach((p, i) => (props[p.prop] = combo[i]));
      const sub: ComponentDoc = { ...doc, rootId: node.id, nodes: { ...doc.nodes, [node.id]: { ...node, parentId: null, props } } };
      flushSync(() => root.render(<ComponentRenderer doc={sub} mode="export" scheme={doc.theme.defaultScheme} breakpoints="media" />));
      const el = host.querySelector(`[data-fx-node="${node.id}"]`);
      if (!el) continue;
      const copy = el.cloneNode(true) as Element;
      // rendu ici comme racine : on retire les classes de portée qu'il n'a pas dans la page
      copy.classList.remove(scope, "dark");
      copy.querySelectorAll("style").forEach((s) => s.remove());
      html[JSON.stringify(combo)] = copy.outerHTML;
    }
    if (Object.keys(html).length) out[node.id] = { props: plan.props.map((p) => p.propName), html };
  }
  return out;
}

export async function buildVanillaExport(doc: ComponentDoc) {
  return buildVanillaFiles(doc, await snapshotDoc(doc));
}

export async function zipFiles(folder: string, files: Record<string, string>): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const dir = zip.folder(folder)!;
  for (const [path, content] of Object.entries(files)) dir.file(path, content);
  return zip.generateAsync({ type: "blob" });
}

export function useVanillaExport(doc: ComponentDoc | null, enabled: boolean, locale = "en") {
  type State = { doc: ComponentDoc; locale: string; result: Awaited<ReturnType<typeof buildVanillaExport>> | null; error: string | null };
  const [state, setState] = React.useState<State | null>(null);
  React.useEffect(() => {
    if (!doc || !enabled) return;
    let alive = true;
    buildVanillaExport(doc).then(
      (result) => alive && setState({ doc, locale, result, error: null }),
      (e) => alive && setState({ doc, locale, result: null, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [doc, enabled, locale]);
  // Résultat d'un modèle (ou d'une langue) précédent : considéré comme en cours de calcul
  const fresh = state && state.doc === doc && state.locale === locale ? state : null;
  return { result: fresh?.result ?? null, error: fresh?.error ?? null };
}
