/**
 * Captures pour l'outil MCP render_preview : un Chromium sans interface (Playwright) ouvre la page
 * /render de ce même serveur et photographie le composant.
 *
 * Playwright est une dépendance de développement : sans lui (ou sans navigateur installé), l'outil
 * renvoie une erreur explicite au lieu de faire échouer le serveur. Le navigateur est partagé entre
 * les appels et fermé après une minute d'inactivité. Le rendu ne peut joindre aucun autre hôte.
 */
import { encodePayload } from "../spec/link";
import { VIEWPORT_WIDTHS, type ViewportName } from "../runtime/viewport";

/* Types minimaux de Playwright (le paquet n'est chargé qu'à l'exécution) */
type PwRoute = { request(): { url(): string }; continue(): Promise<void>; abort(): Promise<void> };
type PwLocator = { boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>; getAttribute(n: string): Promise<string | null> };
type PwPage = {
  route(url: string, fn: (r: PwRoute) => unknown): Promise<void>;
  goto(url: string, o: { waitUntil: "load"; timeout: number }): Promise<unknown>;
  addStyleTag(o: { content: string }): Promise<unknown>;
  waitForSelector(s: string, o: { timeout: number }): Promise<unknown>;
  locator(s: string): PwLocator;
  screenshot(o: { type: "png"; fullPage: boolean; clip: { x: number; y: number; width: number; height: number } }): Promise<Buffer>;
};
type PwContext = { newPage(): Promise<PwPage>; close(): Promise<void> };
type PwBrowser = { newContext(o: Record<string, unknown>): Promise<PwContext>; close(): Promise<void>; isConnected(): boolean };

export class PreviewUnavailable extends Error {}

export type PreviewOptions = {
  /** Spec ou modèle complet, déjà validé */
  spec: unknown;
  origin: string;
  viewport: ViewportName | number;
  scheme?: "light" | "dark";
  overlays: "closed" | "open";
};

export type PreviewResult = { png: Buffer; width: number; height: number; viewportWidth: number; truncated: boolean };

const MAX_HEIGHT = 3000;
let browser: Promise<PwBrowser> | null = null;
let idle: ReturnType<typeof setTimeout> | null = null;
let active = 0;

async function getBrowser(): Promise<PwBrowser> {
  if (browser) {
    const b = await browser.catch(() => null);
    if (b?.isConnected()) return b;
    browser = null;
  }
  browser = (async () => {
    let pw: { chromium: { launch(o: Record<string, unknown>): Promise<PwBrowser> } };
    try {
      const name = "playwright";
      pw = await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ name);
    } catch {
      throw new PreviewUnavailable("render_preview needs Playwright on the server: npm install -D playwright && npx playwright install chromium");
    }
    try {
      return await pw.chromium.launch({ headless: true });
    } catch (e) {
      throw new PreviewUnavailable(`Chromium could not start (${e instanceof Error ? e.message.split("\n")[0] : String(e)}). Run: npx playwright install chromium`);
    }
  })();
  browser.catch(() => (browser = null));
  return browser;
}

function scheduleClose() {
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => {
    if (active > 0 || !browser) return;
    const b = browser;
    browser = null;
    void b.then((x) => x.close()).catch(() => {});
  }, 60_000);
  // ne retient pas le processus (tests, arrêt du serveur)
  (idle as { unref?: () => void }).unref?.();
}

export async function renderPreview(o: PreviewOptions): Promise<PreviewResult> {
  const viewportWidth = typeof o.viewport === "number" ? Math.round(o.viewport) : VIEWPORT_WIDTHS[o.viewport];
  const b = await getBrowser();
  active++;
  const context = await b.newContext({ viewport: { width: viewportWidth, height: 900 }, deviceScaleFactor: 1, colorScheme: o.scheme ?? "light", locale: "en-US" });
  try {
    const page = await context.newPage();
    const origin = new URL(o.origin).origin;
    // Aucune requête hors du serveur lui-même (images distantes, polices, traqueurs…)
    await page.route("**/*", (r) => (new URL(r.request().url()).origin === origin || r.request().url().startsWith("data:") ? r.continue() : r.abort()));
    const hash = new URLSearchParams({ spec: await encodePayload(JSON.stringify(o.spec)), overlays: o.overlays, ...(o.scheme ? { scheme: o.scheme } : {}) });
    await page.goto(`${origin}/render#${hash}`, { waitUntil: "load", timeout: 90_000 });
    // indicateur du serveur de développement Next.js : hors capture
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    // en développement, la première visite compile la page à la demande (plusieurs rechargements) : délai large
    await page.waitForSelector('#forge-render[data-render-state="ready"], #forge-render[data-render-state="error"]', { timeout: 150_000 });
    const root = page.locator("#forge-render");
    if ((await root.getAttribute("data-render-state")) === "error") throw new Error((await root.getAttribute("data-render-error")) ?? "render error");
    const box = await root.boundingBox();
    if (!box) throw new Error("nothing was rendered");
    const height = Math.min(Math.ceil(box.height), MAX_HEIGHT);
    const png = await page.screenshot({ type: "png", fullPage: true, clip: { x: 0, y: Math.floor(box.y), width: viewportWidth, height } });
    return { png, width: viewportWidth, height, viewportWidth, truncated: box.height > MAX_HEIGHT };
  } finally {
    await context.close().catch(() => {});
    active--;
    scheduleClose();
  }
}

/** Ferme le navigateur partagé (tests) */
export async function closePreviewBrowser() {
  if (idle) clearTimeout(idle);
  const b = browser;
  browser = null;
  if (b) await b.then((x) => x.close()).catch(() => {});
}
