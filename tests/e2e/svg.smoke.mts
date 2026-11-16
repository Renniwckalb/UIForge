/**
 * Test de fumée de la brique SVG (Playwright). Prérequis : `npm run dev` lancé.
 * Usage : npx tsx tests/e2e/svg.smoke.mts [baseUrl] [dossierCaptures]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3] ?? "test-results";
mkdirSync(shots, { recursive: true });

const spec = {
  name: "SvgSmoke",
  children: [
    {
      brick: "html.svg",
      texts: { label: "Logo" },
      style: { width: "8rem", fg: "color.primary" },
      props: { markup: '<svg viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#9333ea"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#g)"/><path d="M7 12l3 3 7-7" fill="none" stroke="#fff" stroke-width="2"/></svg>' },
    },
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("dialog", (d) => {
  errors.push(`dialog opened: ${d.message()}`);
  void d.dismiss();
});
const fail = (m: string) => {
  throw new Error(m);
};

await page.goto(`${base}/new?spec=${encodeURIComponent(JSON.stringify(spec))}`, { waitUntil: "load", timeout: 120000 });
await page.getByTestId("create-from-link").click({ timeout: 60000 });
await page.waitForURL(/\/studio\//, { timeout: 30000 });
const svg = page.locator('[data-forge-canvas] svg[data-forge-id="svg1"]');
await svg.waitFor({ timeout: 60000 });
if ((await svg.getAttribute("role")) !== "img" || (await svg.getAttribute("aria-label")) !== "Logo") fail("rôle / libellé");
if ((await svg.locator("linearGradient").getAttribute("id")) !== "svg-smoke-svg1-g") fail("id non préfixé");
const box = await svg.boundingBox();
if (!box || Math.abs(box.width - 128) > 1 || Math.abs(box.height - 128) > 1) fail(`taille ${box?.width}×${box?.height}`);
console.log("✓ rendu dans le canvas (rôle, id préfixé, 8rem × 8rem)");

await svg.click();
await page.getByRole("tab", { name: "Behavior" }).click();
const area = page.locator("#prop-markup");
await area.waitFor();
await area.fill('<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10" fill="#e11d48"/></svg>');
await area.blur();
await page.getByText("Attribute onload (<svg>) removed (not allowed).").waitFor({ timeout: 5000 });
await page.getByText("<script> element removed (not allowed).").waitFor();
if ((await area.inputValue()).includes("alert")) fail("balisage non nettoyé");
if ((await svg.locator("rect").getAttribute("fill")) !== "#e11d48") fail("canvas non mis à jour");
console.log("✓ collage malveillant nettoyé, avertissements affichés");

await page.getByRole("button", { name: "Use text color" }).click();
await page.waitForFunction(() => document.querySelector('[data-forge-canvas] svg rect')?.getAttribute("fill") === "currentColor");
console.log("✓ recoloration en currentColor");

await area.fill("<svg><g></svg>");
await area.blur();
await page.getByText(/Invalid SVG: unexpected <\/svg>/).waitFor();
if ((await svg.locator("rect").count()) !== 1) fail("un SVG invalide a remplacé le dessin");
console.log("✓ SVG invalide refusé, dessin conservé");

await page.screenshot({ path: join(shots, "svg-studio.png") });
await page.getByRole("tab", { name: "Code" }).click();
await page.getByText("currentColor").first().waitFor({ timeout: 10000 });
console.log("✓ onglet Code");

await browser.close();
const real = errors.filter((e) => !/Download the React DevTools/.test(e));
if (real.length) {
  console.log(real.join("\n"));
  process.exit(1);
}
console.log("OK");
