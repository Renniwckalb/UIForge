/**
 * Test de fumée de la brique Icône (Playwright). Prérequis : `npm run dev` lancé.
 * Usage : npx tsx tests/e2e/icon.smoke.mts [baseUrl] [dossierCaptures]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3] ?? "test-results";
mkdirSync(shots, { recursive: true });
const fail = (m: string): never => {
  throw new Error(m);
};

const spec = { name: "IconSmoke", children: [{ brick: "lucide.icon", props: { name: "Star" }, style: { width: "3rem", fg: "color.primary" } }] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/new?spec=${encodeURIComponent(JSON.stringify(spec))}`, { waitUntil: "load", timeout: 120000 });
await page.getByTestId("create-from-link").click({ timeout: 60000 });
await page.waitForURL(/\/studio\//, { timeout: 30000 });
const icon = page.locator('[data-forge-canvas] svg[data-forge-id="icon1"]');
await icon.waitFor({ timeout: 60000 });
await page.waitForFunction(() => document.querySelector('[data-forge-canvas] svg[data-forge-id="icon1"]')?.classList.contains("lucide-star"), null, { timeout: 30000 });
const box = await icon.boundingBox();
if (!box || Math.abs(box.width - 48) > 1 || Math.abs(box.height - 48) > 1) fail(`taille ${box?.width}×${box?.height}`);
if ((await icon.getAttribute("aria-hidden")) !== "true") fail("icône décorative sans aria-hidden");
console.log("✓ icône Star chargée à la demande, 3rem × 3rem, décorative");

await icon.click();
await page.getByRole("tab", { name: "Behavior" }).click();
await page.locator("#prop-name").click();
await page.getByRole("textbox", { name: "Search icons" }).fill("heart");
const heart = page.getByRole("option", { name: "Heart", exact: true });
await heart.waitFor({ timeout: 15000 });
await page.screenshot({ path: join(shots, "icon-picker.png") });
await heart.click();
await page.waitForFunction(() => document.querySelector('[data-forge-canvas] svg[data-forge-id="icon1"]')?.classList.contains("lucide-heart"), null, { timeout: 10000 });
console.log("✓ sélecteur : recherche « heart » → Heart appliqué au canvas");

await page.getByRole("tab", { name: "Code" }).click();
await page.getByText("HeartIcon").first().waitFor({ timeout: 15000 });
console.log("✓ onglet Code : HeartIcon");

await browser.close();
const real = errors.filter((e) => !/Download the React DevTools/.test(e));
if (real.length) {
  console.log(real.join("\n"));
  process.exit(1);
}
console.log("OK");
