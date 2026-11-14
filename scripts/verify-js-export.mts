/* eslint-disable @typescript-eslint/no-explicit-any -- objets du navigateur manipulés dans page.evaluate */
/**
 * Vérifie l'export « Web Component » (JavaScript) de chaque modèle dans Chromium (Playwright) :
 * page HTML en file://, module ES + mount(), plusieurs instances indépendantes, props (attributs,
 * propriétés, setProps), drawer / palette ⌘K dans le Shadow DOM, enveloppe React (bundlée avec esbuild).
 *
 * Usage : npm run verify:js-export
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { TEMPLATES } from "../src/forge/model/templates";
import { ComponentRenderer } from "../src/forge/runtime/Renderer";
import { compileStandalone } from "../src/forge/runtime/tailwind-runtime";
import { buildVanillaFiles, RUNTIME_CLASSES } from "../src/forge/export/vanilla";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const out = join(tmpdir(), "ui-forge-verify-js");
rmSync(out, { recursive: true, force: true });
// Instantané rendu côté serveur (le studio, lui, capture le rendu dans le navigateur)
for (const t of TEMPLATES) {
  const doc = t.build();
  const html = renderToStaticMarkup(React.createElement(ComponentRenderer, { doc, mode: "export", scheme: doc.theme.defaultScheme, breakpoints: "media" })).replace(/<style[\s\S]*?<\/style>/g, "");
  const classes = new Set<string>(RUNTIME_CLASSES);
  for (const m of html.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && classes.add(c));
  const r = buildVanillaFiles(doc, { html, tailwindCss: await compileStandalone([...classes]) });
  for (const [p, c] of Object.entries(r.files)) {
    const f = join(out, r.folder, p);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, c);
  }
}
const fails: string[] = [];
const ok = (c: unknown, m: string) => {
  if (!c) fails.push(m);
  console.log(c ? "  ✓" : "  ✗", m);
};

// petit serveur statique (modules ES : file:// interdit les imports)
const types: Record<string, string> = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css" };
const srv = createServer((req, res) => {
  const f = join(out, decodeURIComponent(req.url!.split("?")[0]));
  if (!existsSync(f)) {
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader("content-type", types[extname(f)] ?? "application/octet-stream");
  res.end(readFileSync(f));
});
await new Promise<void>((r) => srv.listen(4789, r));
const browser = await chromium.launch();

async function page() {
  const p = await browser.newPage();
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith("file:") && !u.startsWith("http://localhost:4789") && !u.startsWith("data:")) errors.push("requête externe " + u);
  });
  return { p, errors };
}
const W = (p: import("playwright").Page, sel: string) => p.waitForFunction((s) => document.querySelector(s)?.shadowRoot?.querySelector("[data-fx-ready]"), sel);

// 1. Page HTML ouverte en file:// (script classique)
{
  console.log("pricing-card : index.html en file://");
  const { p, errors } = await page();
  await p.goto(pathToFileURL(join(out, "pricing-card-js/index.html")).href);
  await W(p, "pricing-card");
  const info = await p.evaluate(() => {
    const el = document.querySelector("pricing-card") as any;
    const sr = el.shadowRoot;
    const root = sr.querySelector("[data-fx-ready]") as HTMLElement;
    const btn = sr.querySelector("button") as HTMLElement;
    const cs = getComputedStyle(btn);
    return {
      text: sr.textContent,
      global: typeof (window as any).UIForge?.PricingCard?.mount,
      btnBg: cs.backgroundColor,
      btnRadius: cs.borderRadius,
      font: getComputedStyle(root).fontFamily,
      shadows: [...sr.querySelectorAll("*")].map((e: Element) => getComputedStyle(e).boxShadow).filter((s) => s !== "none").length,
      hostDisplay: getComputedStyle(el).display,
      pageButtons: document.querySelectorAll("button").length,
    };
  });
  ok(info.text.includes("$29 / month"), "rendu dans le Shadow DOM");
  ok(info.global === "function", "window.UIForge.PricingCard.mount exposé");
  ok(info.btnBg !== "rgba(0, 0, 0, 0)", `styles appliqués (bouton ${info.btnBg}, rayon ${info.btnRadius}, police ${info.font.slice(0, 30)})`);
  ok(info.shadows > 0, `ombres Tailwind actives (@property sur le document) : ${info.shadows}`);
  ok(info.hostDisplay === "block", "hôte display:block");
  ok(info.pageButtons === 0, "aucune fuite dans le DOM de la page");
  const r = await p.evaluate(async () => {
    const a = document.createElement("pricing-card");
    a.setAttribute("data-title", "Équipe");
    a.setAttribute("button-label", "Essayer");
    document.body.appendChild(a);
    const b = document.createElement("pricing-card") as any;
    b.price = "99 €";
    document.body.appendChild(b);
    b.setProps({ badgeLabel: "Nouveau", colorScheme: "dark" });
    const first = document.querySelector("pricing-card") as any;
    await new Promise((r) => setTimeout(r, 50));
    return {
      aText: a.shadowRoot!.textContent!,
      bText: b.shadowRoot.textContent,
      firstText: first.shadowRoot.textContent,
      bDark: b.shadowRoot.querySelector("[data-fx-ready]").classList.contains("dark"),
      bProps: b.getProps().price,
      hostTitle: a.getAttribute("title"),
    };
  });
  ok(r.aText.includes("Équipe") && r.aText.includes("Essayer"), "instance 2 : props par attributs (data-title, button-label)");
  ok(r.bText.includes("99 €") && r.bText.includes("Nouveau") && r.bDark, "instance 3 : propriété + setProps + mode sombre");
  ok(r.firstText.includes("$29 / month") && !r.firstText.includes("99 €"), "instance 1 inchangée (instances indépendantes)");
  ok(r.bProps === "99 €" && r.hostTitle === null, "getProps / pas d'attribut title natif");
    await p.evaluate(() => (document.querySelectorAll("pricing-card")[2] as any).destroy());
  ok((await p.evaluate(() => document.querySelectorAll("pricing-card").length)) === 2, "destroy() retire l'instance");
  ok(errors.length === 0, "aucune erreur console " + errors.join(" | "));
}

// 2. Module ES + mount dans une autre page
{
  console.log("confirm-drawer : import ES + mount + interactions");
  writeFileSync(
    join(out, "confirm-drawer-js/esm.html"),
    `<!doctype html><meta charset="utf-8"><body><main id="app"></main>
<script type="module">
  import ConfirmDrawer, { mount, tagName } from "./components/confirm-drawer/index.js";
  window.__el = mount("#app", { openLabel: "Commander" });
  window.__tag = tagName;
  window.__same = ConfirmDrawer.mount === mount;
</script>`,
  );
  const { p, errors } = await page();
  await p.goto("http://localhost:4789/confirm-drawer-js/esm.html");
  await W(p, "confirm-drawer");
  const t = await p.evaluate(() => ({ tag: (window as any).__tag, same: (window as any).__same, text: (window as any).__el.shadowRoot.textContent, states: (window as any).__el.states }));
  ok(t.tag === "confirm-drawer" && t.same, "exports nommés + défaut");
  ok(t.text.includes("Commander"), "props passées à mount()");
  ok(t.states.includes("drawer1"), "états pilotables : " + t.states);
  await p.locator("confirm-drawer").getByText("Commander").click();
  await p.waitForTimeout(600);
  const opened = await p.evaluate(() => {
    const o = (window as any).__el.shadowRoot.querySelector(".fx-overlay");
    return o && !o.hidden && o.classList.contains("fx-shown");
  });
  ok(opened, "clic sur le déclencheur → drawer ouvert");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  ok(await p.evaluate(() => (window as any).__el.shadowRoot.querySelector(".fx-overlay").hidden), "Échap → fermé");
  await p.evaluate(() => (window as any).__el.open("drawer1"));
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => !(window as any).__el.shadowRoot.querySelector(".fx-overlay").hidden), "el.open(id)");
  ok(errors.length === 0, "aucune erreur console " + errors.join(" | "));
}

// 3. Palette ⌘K (raccourci global depuis le Shadow DOM)
{
  console.log("command-palette : raccourci");
  const { p, errors } = await page();
  await p.goto(pathToFileURL(join(out, "command-palette-js/index.html")).href);
  await W(p, "command-palette");
  await p.keyboard.press("Control+k");
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => {
    const sr = document.querySelector("command-palette")!.shadowRoot!;
    const o = sr.querySelector(".fx-palette") as HTMLElement;
    return { open: !!o && !o.hidden, focus: sr.activeElement?.tagName };
  });
  ok(st.open, "Ctrl+K ouvre la palette");
  ok(st.focus === "INPUT", "focus dans le champ de recherche : " + st.focus);
  await p.keyboard.type("zzzz");
  ok(await p.evaluate(() => [...document.querySelector("command-palette")!.shadowRoot!.querySelectorAll("[cmdk-item]")].every((i) => (i as HTMLElement).hidden)), "filtrage");
  ok(errors.length === 0, "aucune erreur console " + errors.join(" | "));
}

// 4. React : enveloppe react.js (bundlée comme dans un projet Vite / Next)
{
  console.log("React : react.js");
  writeFileSync(
    join(out, "hero-section-js/app.jsx"),
    `import * as React from "react";
import { createRoot } from "react-dom/client";
import HeroSection from "./components/hero-section/react";
import PricingCard from "../pricing-card-js/components/pricing-card/react.js";
function App() {
  const [label, setLabel] = React.useState("Prix React");
  const ref = React.useRef(null);
  React.useEffect(() => { window.__ref = ref; window.__setLabel = setLabel; }, []);
  return <div><HeroSection className="hero" style={{ marginBottom: 20 }} />
    <PricingCard ref={ref} price={label} colorScheme="dark" />
    <pricing-card button-label="Balise directe" /></div>;
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);`,
  );
  await build({
    entryPoints: [join(out, "hero-section-js/app.jsx")],
    bundle: true,
    outfile: join(out, "hero-section-js/app.bundle.js"),
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    nodePaths: [resolve("node_modules")],
    logLevel: "error",
  });
  writeFileSync(join(out, "hero-section-js/react.html"), `<!doctype html><meta charset="utf-8"><body><div id="root"></div><script src="app.bundle.js"></script>`);
  const { p, errors } = await page();
  await p.goto("http://localhost:4789/hero-section-js/react.html");
  await p.waitForFunction(() => document.querySelectorAll("pricing-card").length === 2 && document.querySelector("hero-section")?.shadowRoot?.querySelector("[data-fx-ready]"));
  await p.waitForTimeout(200);
  const r1 = await p.evaluate(() => {
    const [w, direct] = document.querySelectorAll("pricing-card") as any;
    const h = document.querySelector("hero-section") as HTMLElement;
    return {
      price: w.shadowRoot.textContent.includes("Prix React"),
      dark: w.shadowRoot.querySelector("[data-fx-ready]").classList.contains("dark"),
      direct: direct.shadowRoot.textContent.includes("Balise directe"),
      heroClass: h.className,
      heroMargin: h.style.marginBottom,
      refOk: (window as any).__ref.current === w,
    };
  });
  ok(r1.price && r1.dark, "props React appliquées");
  ok(r1.direct, "balise <pricing-card> directement en JSX");
  ok(r1.heroClass === "hero" && r1.heroMargin === "20px", "className / style sur l'hôte");
  ok(r1.refOk, "ref = élément");
  await p.evaluate(() => (window as any).__setLabel("Mis à jour"));
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => (document.querySelector("pricing-card") as any).shadowRoot.textContent.includes("Mis à jour")), "re-rendu React → props mises à jour");
  ok(errors.length === 0, "aucune erreur console " + errors.join(" | "));
}

// 5. Tous les modèles se chargent sans erreur
for (const f of ["my-component-js", "newsletter-signup-js", "animated-stat-js", "hero-section-js", "confirm-drawer-js"]) {
  const { p, errors } = await page();
  await p.goto(pathToFileURL(join(out, f, "index.html")).href);
  await p.waitForTimeout(400);
  const ready = await p.evaluate(() => !!document.querySelector("body > *")?.shadowRoot?.querySelector("[data-fx-ready]"));
  ok(ready && errors.length === 0, `${f}/index.html prêt sans erreur ${errors.join(" | ")}`);
}

await browser.close();
srv.close();
console.log(fails.length ? `\n✗ ${fails.length} échec(s)` : "\nTout est OK");
process.exit(fails.length ? 1 : 0);
