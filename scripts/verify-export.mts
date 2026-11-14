/**
 * Vérifie qu'un composant exporté fonctionne dans un projet Next.js VIERGE :
 *  1. crée (une fois) un projet avec create-next-app dans un dossier temporaire
 *  2. y dépose les dossiers exportés de chaque modèle (TSX, + une variante JSX)
 *  3. exécute la commande `npm install` indiquée dans chaque README
 *  4. rend chaque composant avec `<Composant />` et une variante avec props, puis `next build`
 *  5. démarre le serveur et vérifie le HTML (textes par défaut et personnalisés)
 *  6. si Playwright est disponible : ouvre le Drawer, la palette ⌘K et vérifie l'animation NumberFlow
 *
 * Usage : npm run verify:export [-- --dir <dossier>] [--only pricing-card,stat]
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { TEMPLATES } from "../src/forge/model/templates";
import { createEmptyDoc, createNode, insertNode } from "../src/forge/model/ops";
import { VENDOR_SOURCES } from "../src/forge/generated/vendor-sources";
import { THIRD_PARTY } from "../src/forge/licenses/third-party";
import { BEAUTIFUL_UI_MOTION, BEAUTIFUL_UI_REF, BEAUTIFUL_UI_THEME } from "../src/forge/tokens/beautiful-ui";
import { buildExport } from "../src/forge/export/bundle";
import { findBrick } from "../src/forge/bricks/registry";
import { walk } from "../src/forge/model/ops";
import type { ComponentDoc } from "../src/forge/model/types";

/** Textes exposés visibles au premier rendu serveur (hors contenus d'overlays fermés) */
function ssrVisibleTexts(doc: ComponentDoc): Set<string> {
  const hidden = new Set<string>();
  walk(doc, (n) => {
    const b = findBrick(n.brick);
    if (b?.state?.kind !== "open" || n.props[b.state.initialProp] === true) return;
    for (const [k, t] of Object.entries(n.texts)) if (!/^(trigger)$/.test(k)) hidden.add(t.propName);
    for (const [slot, ids] of Object.entries(n.slots)) if (slot !== "trigger") ids.forEach((id) => walk(doc, (c) => Object.values(c.texts).forEach((t) => hidden.add(t.propName)), id));
  });
  return hidden;
}

const args = process.argv.slice(2);
const argVal = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = argVal("--dir") ?? join(tmpdir(), "ui-forge-verify");
const only = argVal("--only")?.split(",");
const app = join(base, "blank-next-app");
const run = (cmd: string, cwd = app) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
};

mkdirSync(base, { recursive: true });
if (!existsSync(join(app, "package.json"))) {
  run(`npx --yes create-next-app@latest blank-next-app --ts --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes --disable-git`, base);
}

/** Documents de test supplémentaires : Dialogue animé + styles responsive, préréglage Beautiful UI */
function dialogDemo(): ComponentDoc {
  const doc = createEmptyDoc("ResponsiveDialog");
  const root = doc.nodes[doc.rootId];
  root.style.base.px = { token: "space.4" };
  root.style.md = { px: { token: "space.8" } };
  root.style.lg = { px: { value: "72px" } };
  const title = createNode(doc, "html.heading");
  title.texts.text.value = "Titre responsive";
  title.style.md = { textAlign: { value: "center" } };
  insertNode(doc, title, root.id, "children", 0);
  const dialog = createNode(doc, "shadcn.dialog");
  dialog.texts.title.value = "Dialogue animé";
  insertNode(doc, dialog, root.id, "children", 1);
  const trigger = createNode(doc, "shadcn.button");
  trigger.texts.label.value = "Ouvrir le dialogue";
  insertNode(doc, trigger, dialog.id, "trigger", 0);
  return doc;
}
function beautifulNewsletter(): ComponentDoc {
  const doc = TEMPLATES.find((t) => t.id === "newsletter")!.build();
  doc.name = "BeautifulNewsletter";
  Object.assign(doc.theme, structuredClone(BEAUTIFUL_UI_THEME), { preset: { ...BEAUTIFUL_UI_REF } });
  const stagger = BEAUTIFUL_UI_MOTION.find((m) => m.id === "stagger")!;
  doc.nodes[doc.rootId].slots.children.forEach((id, i) => {
    doc.nodes[id].animation = { ...stagger.spec, delayMs: i * stagger.stagger!, origin: "beautiful-ui" };
  });
  return doc;
}

const templates = [
  ...TEMPLATES.filter((t) => t.id !== "blank").map((t) => ({ id: t.id, build: t.build })),
  { id: "responsive-dialog", build: dialogDemo },
  { id: "beautiful-newsletter", build: beautifulNewsletter },
].filter((t) => !only || only.includes(t.id));
rmSync(join(app, "src", "components"), { recursive: true, force: true });
const installs = new Set<string>();
const rendered: { name: string; folder: string; texts: string[]; custom?: { prop: string; value: string }; extra?: string[] }[] = [];
const failures: string[] = [];

for (const [i, t] of templates.entries()) {
  const doc: ComponentDoc = t.build();
  const lang = i === 0 ? "jsx" : "tsx"; // le premier modèle est exporté en JavaScript pour couvrir l'option .jsx
  const bundle = buildExport(doc, { language: lang });
  const folder = lang === "jsx" ? `${bundle.folder}-js` : bundle.folder;
  const dir = join(app, "src", "components", folder);
  for (const [p, content] of Object.entries(bundle.files)) {
    mkdirSync(join(dir, p, ".."), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
  // la commande d'installation est lue depuis le README, comme le ferait un utilisateur
  const readme = readFileSync(join(dir, "README.md"), "utf8");
  const cmd = readme.match(/```bash\n(npm install [^\n]+)\n```/)?.[1];
  if (cmd) cmd.replace("npm install ", "").split(" ").forEach((p) => installs.add(p));
  // seules les props de texte (pas les props de configuration comme shortcut)
  const textProps = new Set(Object.values(doc.nodes).flatMap((n) => Object.values(n.texts).filter((b) => b.expose).map((b) => b.propName)));
  const firstText = bundle.gen.props.find((p) => textProps.has(p.name) && p.type === "string" && p.defaultValue && p.defaultValue !== '""' && !ssrVisibleTexts(doc).has(p.name));
  rendered.push({
    name: bundle.gen.componentName,
    folder,
    texts: bundle.gen.props
      .filter((p) => textProps.has(p.name) && p.type === "string" && p.defaultValue && p.defaultValue.length > 4 && !ssrVisibleTexts(doc).has(p.name))
      .map((p) => JSON.parse(p.defaultValue!)) as string[],
    custom: firstText ? { prop: firstText.name, value: `Texte personnalisé ${i}` } : undefined,
  });
  // THIRD_PARTY_NOTICES.md : uniquement les bibliothèques réellement présentes, texte complet + copyright
  const notices = bundle.files["THIRD_PARTY_NOTICES.md"];
  const uiFiles = Object.keys(bundle.files).filter((f) => f.startsWith("ui/")).map((f) => f.replace(/\.jsx$/, ".tsx"));
  const expected = new Set<string>();
  for (const f of uiFiles) {
    expected.add(VENDOR_SOURCES[f].origin);
    VENDOR_SOURCES[f].derived.forEach((d) => expected.add(d));
    // en-têtes / contenu des sources copiées conservés à l'identique (TSX)
    if (lang === "tsx" && bundle.files[f] !== VENDOR_SOURCES[f].code) failures.push(`${t.id} : ${f} diffère de la source copiée`);
  }
  if (doc.theme.preset?.id === "beautiful-ui") expected.add("beautiful-ui");
  if (!notices) failures.push(`${t.id} : THIRD_PARTY_NOTICES.md absent`);
  else
    for (const [id, tp] of Object.entries(THIRD_PARTY)) {
      const present = notices.includes(tp.copyright) && notices.includes("Permission is hereby granted");
      if (expected.has(id) && !present) failures.push(`${t.id} : THIRD_PARTY_NOTICES sans ${tp.name}`);
      if (!expected.has(id) && notices.includes(tp.copyright)) failures.push(`${t.id} : THIRD_PARTY_NOTICES cite ${tp.name} à tort`);
    }
  if (!bundle.files["README.md"].includes("## Licenses")) failures.push(`${t.id} : README sans section Licences`);
  // sharp / libvips (LGPL, dépendance optionnelle de Next) ne doit jamais faire partie d'un export
  if (bundle.npm.some((n) => /sharp|@img\//.test(n)) || Object.entries(bundle.files).some(([f, c]) => /sharp|libvips/i.test(f) || /sharp|libvips|@img\//i.test(c)))
    failures.push(`${t.id} : sharp/libvips présent dans l'export`);
  if (doc.theme.preset?.id === "beautiful-ui" && !bundle.files["README.md"].includes("next/font")) failures.push(`${t.id} : README sans instructions de polices`);
  if (t.id === "command-palette") rendered[rendered.length - 1].extra = [`shortcut="mod+j"`, `enableShortcut={false}`];
  console.log(`✓ export ${t.id} → src/components/${folder} (${Object.keys(bundle.files).join(", ")}) · notices : ${[...expected].join(", ") || "aucun code tiers"}`);
}

run(`npm install ${[...installs].join(" ")}`);

const imports = rendered.map((r) => `import ${r.name} from "@/components/${r.folder}";`).join("\n");
const defaults = rendered.map((r) => `      <section data-test="${r.folder}">\n        <${r.name} />\n      </section>`).join("\n");
const customs = rendered
  .filter((r) => r.custom)
  .map((r) => `      <section data-test="${r.folder}-custom">\n        <${r.name} ${r.custom!.prop}="${r.custom!.value}" />\n      </section>`)
  .join("\n");
const extras = rendered
  .flatMap((r) => (r.extra ?? []).map((attrs, k) => `      <section data-test="${r.folder}-extra${k}">\n        <${r.name} ${attrs} />\n      </section>`))
  .join("\n");
writeFileSync(
  join(app, "src", "app", "page.tsx"),
  `${imports}\n\nexport default function Home() {\n  return (\n    <main style={{ display: "grid", gap: 48, padding: 32 }}>\n${defaults}\n${customs}\n${extras}\n    </main>\n  );\n}\n`,
);

run("npx next build");

// Démarrage + vérifications
// Port libre choisi par le système (évite de tester un ancien serveur resté actif)
const port = await new Promise<number>((resolve) => {
  const srv = createServer();
  srv.listen(0, () => {
    const p = (srv.address() as { port: number }).port;
    srv.close(() => resolve(p));
  });
});
const server = spawn(`npx next start -p ${port}`, { cwd: app, shell: true, stdio: "pipe" });
try {
  let html = "";
  for (let i = 0; i < 60; i++) {
    try {
      html = await (await fetch(`http://localhost:${port}/`)).text();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const decoded = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  for (const r of rendered) {
    for (const t of r.texts) {
      if (!decoded.includes(t)) failures.push(`${r.name} : texte par défaut absent du HTML : « ${t} »`);
    }
    if (r.custom && !decoded.includes(r.custom.value)) failures.push(`${r.name} : prop ${r.custom.prop} non appliquée`);
  }
  console.log(`HTML : ${failures.length ? "échecs" : "tous les textes par défaut et personnalisés sont rendus"}`);

  // Vérification interactive optionnelle
  let pw: typeof import("playwright") | null = null;
  try {
    pw = await import("playwright");
  } catch {
    console.log("(Playwright absent : vérifications interactives ignorées)");
  }
  if (pw) {
    const browser = await pw.chromium.launch();
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const check = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
        console.log(`✓ ${label}`);
      } catch (e) {
        failures.push(`${label} : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      }
    };
    if (rendered.some((r) => r.folder.startsWith("confirm-drawer"))) {
      await check("Drawer (Base UI) : s'ouvre au clic et se ferme via « Annuler »", async () => {
        await page.locator('[data-test^="confirm-drawer"] button', { hasText: "Passer commande" }).first().click();
        await page.getByRole("dialog").getByText("Confirmer la commande").waitFor({ timeout: 4000 });
        const bg = await page.getByRole("dialog").evaluate((el) => getComputedStyle(el).backgroundColor);
        if (bg === "rgba(0, 0, 0, 0)") throw new Error("le contenu du drawer n'a pas de fond (tokens non appliqués dans le portal)");
        await page.getByRole("dialog").getByRole("button", { name: "Annuler" }).click();
        await page.getByRole("dialog").waitFor({ state: "detached", timeout: 4000 });
      });
    }
    if (rendered.some((r) => r.folder.startsWith("command-palette"))) {
      await check("Raccourcis : shortcut=\"mod+j\" et enableShortcut={false} respectés", async () => {
        await page.keyboard.press("Control+j");
        await page.getByRole("dialog").first().waitFor({ timeout: 4000 });
        const n = await page.locator("[cmdk-input]").count();
        if (n !== 1) throw new Error(`Ctrl+J a ouvert ${n} palette(s), 1 attendue`);
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").first().waitFor({ state: "detached", timeout: 4000 });
        await page.keyboard.press("Control+k");
        await page.getByRole("dialog").first().waitFor({ timeout: 4000 });
        const k = await page.locator("[cmdk-input]").count();
        if (k !== 2) throw new Error(`Ctrl+K a ouvert ${k} palette(s), 2 attendues (la palette désactivée ne doit pas réagir)`);
        for (let i = 0; i < 4 && (await page.locator("[cmdk-input]").count()) > 0; i++) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(250);
        }
      });
      await check("Palette cmdk : Ctrl+K ouvre, la recherche filtre", async () => {
        await page.keyboard.press("Control+k");
        // deux instances sur la page (défaut + personnalisée) : chacune écoute ⌘K
        const input = page.getByPlaceholder("Rechercher une commande…").first();
        await input.waitFor({ timeout: 4000 });
        await input.fill("param");
        await page.getByRole("option", { name: "Paramètres" }).first().waitFor({ timeout: 2000 });
        const dialog = page.getByRole("dialog").first();
        if ((await dialog.getByRole("option").count()) !== 1) throw new Error("le filtrage n'a pas réduit la liste");
        // fermer toutes les palettes ouvertes (une par instance)
        for (let i = 0; i < 4 && (await page.locator("[cmdk-input]").count()) > 0; i++) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(250);
        }
      });
    }
    if (rendered.some((r) => r.folder.startsWith("animated-stat"))) {
      await check("NumberFlow : anime jusqu'à la valeur puis change au clic", async () => {
        const stat = page.locator('[data-test^="animated-stat"]').first();
        await page.waitForTimeout(1500);
        const txt = async () =>
          stat.locator("number-flow-react").first().evaluate((el) => String((el as unknown as { _internals?: { ariaLabel?: string } })._internals?.ariaLabel ?? el.getAttribute("aria-label") ?? "").replace(/[^\d]/g, ""));
        const first = await txt();
        if (first !== "48250") throw new Error(`valeur affichée inattendue : ${first}`);
        await stat.getByRole("button", { name: "Mois dernier" }).click();
        await page.waitForTimeout(1200);
        const second = await txt();
        if (second !== "39120") throw new Error(`après clic : ${second}`);
      });
    }
    if (rendered.some((r) => r.folder.startsWith("responsive-dialog"))) {
      await check("Dialogue : fondu + zoom à l'ouverture et à la fermeture (keyframes tw-animate-css embarqués)", async () => {
        const sec = page.locator('[data-test^="responsive-dialog"]').first();
        await sec.getByRole("button", { name: "Ouvrir le dialogue" }).click();
        const content = page.locator('[data-slot="dialog-content"]').first();
        await content.waitFor({ timeout: 4000 });
        const open = await content.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { name: cs.animationName, duration: cs.animationDuration, scale: cs.getPropertyValue("--tw-enter-scale").trim(), opacity: cs.getPropertyValue("--tw-enter-opacity").trim() };
        });
        if (open.name !== "enter" || open.duration !== "0.1s" || parseFloat(open.scale) !== 0.95 || open.opacity !== "0") throw new Error(`ouverture : ${JSON.stringify(open)}`);
        const hasKf = await page.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r instanceof CSSKeyframesRule && r.name === "enter"); } catch { return false; } }));
        if (!hasKf) throw new Error("@keyframes enter absent de la page");
        await page.keyboard.press("Escape");
        const closing = await content.evaluate((el) => new Promise<string>((res) => requestAnimationFrame(() => res(getComputedStyle(el).animationName))));
        if (closing !== "exit") throw new Error(`fermeture : animation ${closing}`);
        await content.waitFor({ state: "detached", timeout: 4000 });
      });
      await check("Responsive : base / md / lg appliqués selon la largeur", async () => {
        const root = page.locator('[data-test="responsive-dialog"] > div').first();
        const title = page.locator('[data-test="responsive-dialog"] h2').first();
        const measure = async () => ({ pad: await root.evaluate((el) => getComputedStyle(el).paddingLeft), align: await title.evaluate((el) => getComputedStyle(el).textAlign) });
        await page.setViewportSize({ width: 390, height: 900 });
        const m = await measure();
        await page.setViewportSize({ width: 900, height: 900 });
        const t = await measure();
        await page.setViewportSize({ width: 1280, height: 900 });
        const d = await measure();
        if (m.pad !== "16px" || t.pad !== "32px" || d.pad !== "72px") throw new Error(`padding mobile/tablette/desktop : ${m.pad} / ${t.pad} / ${d.pad}`);
        if (m.align === "center" || t.align !== "center" || d.align !== "center") throw new Error(`text-align : ${m.align} / ${t.align} / ${d.align}`);
      });
    }
    if (rendered.some((r) => r.folder.startsWith("beautiful-newsletter"))) {
      await check("Animations Beautiful UI : fade-up 450 ms, entrée décalée de 80 ms, ease-out-strong", async () => {
        const kids = page.locator('[data-test="beautiful-newsletter"] > div > *');
        const info = await kids.evaluateAll((els) => els.map((el) => { const cs = getComputedStyle(el); return { name: cs.animationName, dur: cs.animationDuration, delay: cs.animationDelay, ease: cs.animationTimingFunction }; }));
        if (info.length < 3) throw new Error("enfants introuvables");
        info.forEach((a, i) => {
          if (a.name !== "beautiful-newsletter-fade-up" || a.dur !== "0.45s" || a.delay !== `${(i * 0.08).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}s` || !a.ease.includes("0.23, 1, 0.32, 1"))
            throw new Error(`enfant ${i} : ${JSON.stringify(a)}`);
        });
      });
      await check("prefers-reduced-motion : animations coupées", async () => {
        const ctx = await browser.newContext({ reducedMotion: "reduce" });
        const p2 = await ctx.newPage();
        await p2.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
        const name = await p2.locator('[data-test="beautiful-newsletter"] > div > *').first().evaluate((el) => getComputedStyle(el).animationName);
        await ctx.close();
        if (name !== "none") throw new Error(`animation encore active : ${name}`);
      });
    }
    if (errors.length) failures.push(`Erreurs console : ${[...new Set(errors)].join(" | ").slice(0, 500)}`);
    await browser.close();
  }
} finally {
  server.kill();
  if (process.platform === "win32" && server.pid) {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    } catch {
      /* déjà arrêté */
    }
  }
}

if (failures.length) {
  console.error("\n✗ Vérification échouée :\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`\n✓ ${rendered.length} composants exportés fonctionnent dans un projet Next.js vierge (${app}).`);
process.exit(0);
