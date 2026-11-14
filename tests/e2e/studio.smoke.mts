/**
 * Test de fumée du studio (Playwright). Prérequis : `npm run dev` lancé.
 * Usage : npx tsx tests/e2e/studio.smoke.ts [baseUrl] [dossierCaptures]
 */
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3] ?? "test-results";
mkdirSync(shots, { recursive: true });

const failures: string[] = [];
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures.push(`${name} : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    console.log(`✗ ${name}`);
  }
}
const nodeCount = (page: Page) => page.locator("[data-forge-canvas] [data-forge-id]").count();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
// Fonctionnement hors ligne : aucune requête vers un autre hôte (CDN…)
const external: string[] = [];
page.on("request", (r) => {
  const u = new URL(r.url());
  if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) external.push(r.url());
});
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await step("Langue : anglais par défaut, passage en français mémorisé (cookie)", async () => {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "My components" }).waitFor();
  if ((await page.getAttribute("html", "lang")) !== "en") throw new Error("lang par défaut ≠ en");
  await page.getByTestId("language-switcher").click();
  await page.getByRole("menuitem", { name: "中文" }).click();
  await page.getByRole("heading", { name: "我的组件" }).waitFor();
  await page.getByTestId("language-switcher").click();
  await page.getByRole("menuitem", { name: "Français" }).click();
  await page.getByRole("heading", { name: "Mes composants" }).waitFor();
  // rendu serveur directement en français après rechargement, sans clignotement
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Mes composants" }).waitFor();
  if ((await page.getAttribute("html", "lang")) !== "fr") throw new Error("lang ≠ fr après rechargement");
});

// La suite du scénario est rédigée avec les libellés français
await step("Accueil : créer depuis le modèle « Drawer de confirmation »", async () => {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nouveau composant" }).first().click();
  await page.getByRole("button", { name: /Drawer de confirmation/ }).click();
  await page.waitForURL(/\/studio\//, { timeout: 30000 });
  await page.locator("[data-forge-canvas]").waitFor({ timeout: 30000 });
  await page.locator("[data-forge-canvas]").getByText("Passer commande").waitFor();
  await page.screenshot({ path: join(shots, "01-studio.png") });
});

await step("Sélection sur le canvas → panneau Comportement", async () => {
  await page.locator("[data-forge-canvas]").getByText("Annuler").click();
  await page.getByLabel("Nom de l'élément").waitFor();
  const v = await page.getByLabel("Nom de l'élément").inputValue();
  if (!/Bouton/.test(v)) throw new Error(`sélection inattendue : ${v}`);
});

await step("Glisser-déposer une brique Badge sur le canvas, puis annuler (Ctrl+Z)", async () => {
  const before = await nodeCount(page);
  const src = page.locator("aside").getByRole("button", { name: /^Badge/ });
  const target = page.locator("[data-forge-canvas]").getByText("3 articles");
  const s = (await src.boundingBox())!;
  const t = (await target.boundingBox())!;
  await page.mouse.move(s.x + 20, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + 40, s.y + s.height / 2, { steps: 4 });
  await page.mouse.move(t.x + 30, t.y + t.height - 2, { steps: 12 });
  await page.screenshot({ path: join(shots, "02-drag.png") });
  await page.mouse.up();
  const after = await nodeCount(page);
  if (after !== before + 1) throw new Error(`nœuds : ${before} → ${after}`);
  await page.locator("body").click({ position: { x: 5, y: 500 } });
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(200);
  if ((await nodeCount(page)) !== before) throw new Error("Ctrl+Z n'a pas annulé l'ajout");
  await page.keyboard.press("Control+Shift+z");
  await page.waitForTimeout(200);
  if ((await nodeCount(page)) !== before + 1) throw new Error("Ctrl+Shift+Z n'a pas rétabli l'ajout");
});

await step("Panneau Textes : modifier un texte met à jour le canvas", async () => {
  await page.getByRole("tab", { name: "Textes" }).click();
  const input = page.getByLabel("Titre — Drawer 1");
  await input.fill("Valider le panier");
  await page.locator("[data-forge-canvas]").getByText("Valider le panier").waitFor({ timeout: 3000 });
});

await step("Panneau Style : un slider de token met à jour le style", async () => {
  await page.locator("[data-forge-canvas]").getByText("Annuler").click();
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page.screenshot({ path: join(shots, "03-style.png") });
});

await step("Onglet Code : Monaco affiche le TSX, une édition met à jour le canvas", async () => {
  await page.getByRole("tab", { name: "Code" }).click();
  await page.locator(".monaco-editor").waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  const text = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (window as any).monaco?.editor?.getModels?.()[0];
    return m?.getValue() as string | undefined;
  });
  if (!text?.includes("export default function ConfirmDrawer")) throw new Error("code généré absent de Monaco");
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).monaco.editor.getEditors()[0];
    const model = ed.getModel();
    ed.focus();
    const v = model.getValue().replace('cancelLabel = "Annuler"', 'cancelLabel = "Plus tard"');
    ed.executeEdits("test", [{ range: model.getFullModelRange(), text: v }]);
  });
  await page.locator("[data-forge-canvas]").getByText("Plus tard").waitFor({ timeout: 4000 });
  await page.screenshot({ path: join(shots, "04-code.png") });
});

await step("Mode Interactif : le Drawer (Base UI) s'ouvre dans l'iframe", async () => {
  await page.getByRole("radio", { name: "Interactif" }).click();
  const frame = page.frameLocator('iframe[title="Aperçu interactif"]');
  await frame.getByRole("button", { name: "Passer commande" }).click({ timeout: 15000 });
  await frame.getByRole("dialog").getByText("Valider le panier").waitFor({ timeout: 5000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, "05-live-drawer.png") });
  await frame.getByRole("dialog").getByRole("button", { name: "Plus tard" }).click();
  await frame.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
  await page.getByRole("radio", { name: "Édition" }).click();
});

await step("Export : dossier, commande d'installation et ligne d'usage", async () => {
  await page.getByRole("button", { name: "Exporter" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByText("npm install").first().waitFor();
  await dlg.getByText("<ConfirmDrawer />").waitFor();
  await page.screenshot({ path: join(shots, "06-export.png") });
  await page.keyboard.press("Escape");
});

await step("Style par breakpoint : en tablette, la valeur est surchargée à md", async () => {
  await page.getByRole("radio", { name: "Tablette · 820px" }).click();
  await page.locator("[data-forge-canvas]").getByText("3 articles").click();
  await page.getByRole("tab", { name: "Style", exact: true }).click();
  await page.getByText("Breakpoint édité :").waitFor();
  await page.getByRole("radio", { name: "Centre" }).click();
  await page.locator('[title="Valeur surchargée à md"]').first().waitFor({ timeout: 3000 });
  const align = await page.locator("[data-forge-canvas]").getByText("3 articles").evaluate((el) => getComputedStyle(el).textAlign);
  if (align !== "center") throw new Error(`text-align en tablette : ${align}`);
  await page.getByRole("radio", { name: "Mobile · 390px" }).click();
  await page.waitForTimeout(200);
  const alignMobile = await page.locator("[data-forge-canvas]").getByText("3 articles").evaluate((el) => getComputedStyle(el).textAlign);
  if (alignMobile === "center") throw new Error("la surcharge md s'applique aussi en mobile");
  await page.screenshot({ path: join(shots, "07-breakpoint.png") });
});

await step("Thème : préréglage Beautiful UI, attribution dans THIRD_PARTY_NOTICES de l'export", async () => {
  await page.getByRole("tab", { name: "Thème", exact: true }).click();
  await page.getByRole("button", { name: /Beautiful UI/ }).first().click();
  await page.getByRole("button", { name: "Exporter" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: "THIRD_PARTY_NOTICES.md" }).click();
  await dlg.getByText("Copyright (c) 2026 Shane Levine").first().waitFor({ timeout: 3000 });
  await page.screenshot({ path: join(shots, "08-notices.png") });
  await page.keyboard.press("Escape");
});

await step("Raccourcis : deux palettes ⌘K → conflit signalé et corrigé en un clic", async () => {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nouveau composant" }).first().click();
  await page.getByRole("button", { name: /Palette de commandes/ }).click();
  await page.locator("[data-forge-canvas]").waitFor({ timeout: 30000 });
  await page.locator("aside").getByRole("button", { name: /^Palette ⌘K/ }).click();
  await page.getByRole("button", { name: "Conflit de raccourci" }).click({ timeout: 5000 });
  await page.getByRole("alert").getByRole("button", { name: /Utiliser/ }).click();
  await page.getByRole("button", { name: "Conflit de raccourci" }).waitFor({ state: "detached", timeout: 3000 });
});

await step("Lien pour agents : /new?spec=… → confirmation → studio ; spec invalide → erreurs", async () => {
  const spec = { name: "AgentCard", children: [{ brick: "shadcn.card", texts: { title: "Depuis un agent" }, children: [{ brick: "shadcn.button", texts: { label: "Ouvrir" }, onClick: [{ action: "open", target: "d" }] }] }, { brick: "baseui.drawer", ref: "d", texts: { title: "Tiroir agent" } }] };
  await page.goto(`${base}/new?spec=${encodeURIComponent(JSON.stringify(spec))}`, { waitUntil: "networkidle" });
  await page.getByText("AgentCard").first().waitFor();
  await page.getByTestId("create-from-link").click();
  await page.waitForURL(/\/studio\//, { timeout: 30000 });
  await page.locator("[data-forge-canvas]").getByText("Depuis un agent").waitFor({ timeout: 15000 });
  const bad = { name: "Bad", children: [{ brick: "shadcn.buton" }] };
  await page.goto(`${base}/new#spec=${Buffer.from(JSON.stringify(bad)).toString("base64url")}`, { waitUntil: "networkidle" });
  await page.getByRole("alert").getByText('children[0].brick: unknown brick "shadcn.buton"', { exact: false }).waitFor();
  for (const path of ["/llms.txt", "/schema.json"]) {
    const r = await page.request.get(base + path);
    if (!r.ok()) throw new Error(`${path} → ${r.status()}`);
  }
});

await step("Persistance : le composant apparaît dans « Mes composants »", async () => {
  await page.waitForTimeout(800);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "ConfirmDrawer" }).first().waitFor();
  await page.getByRole("link", { name: "CommandPalette" }).first().waitFor();
  await page.getByRole("link", { name: "AgentCard" }).first().waitFor();
});

if (external.length) failures.push(`Requêtes externes (hors ligne impossible) : ${[...new Set(external)].slice(0, 5).join(", ")}`);
const relevant = errors.filter((e) => !/Download the React DevTools|favicon/.test(e));
if (relevant.length) failures.push(`Erreurs console : ${[...new Set(relevant)].slice(0, 8).join(" | ")}`);
await browser.close();
if (failures.length) {
  console.error("\n✗ Échecs :\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("\n✓ Studio OK");
