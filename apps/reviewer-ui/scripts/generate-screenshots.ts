import { mkdir } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

/** Route → screenshot filename. Routes are real URLs, so we deep-link directly. */
const pages = [
  ['/', 'landing.png'],
  ['/lab', 'lab.png'],
  ['/threat-map', 'threat-map.png'],
  ['/projects', 'projects.png'],
  ['/about', 'about.png'],
] as const;

const providedBaseUrl = process.env.REVIEWER_UI_URL;
const findOpenPort = async () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolve(address.port));
    });
  });

const port = providedBaseUrl ? undefined : process.env.REVIEWER_UI_PORT ?? String(await findOpenPort());
const baseUrl = providedBaseUrl ?? `http://127.0.0.1:${port}`;
const outputDir = new URL('../../../evidence/screenshots/', import.meta.url);

await mkdir(outputDir, { recursive: true });

const waitForServer = async (url: string, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not up yet; retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for reviewer UI at ${url}. Run npm run build before generating screenshots.`);
};

let server: ChildProcess | undefined;
if (!providedBaseUrl) {
  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', port!, '--strictPort'], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

const out = (name: string) => fileURLToPath(new URL(name, outputDir));

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch();

  // Desktop captures, one per route. The new UI is animation-heavy, so we give
  // each route a moment to settle rather than waiting on a specific selector.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  for (const [route, file] of pages) {
    await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
    await desktop.waitForTimeout(1200);
    await desktop.screenshot({ path: out(file), fullPage: true });
  }
  await desktop.close();

  // Mobile capture of the landing page.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobile.goto(`${baseUrl}/`, { waitUntil: 'networkidle' }).catch(() => {});
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: out('mobile-landing.png'), fullPage: true });
  await mobile.close();

  await browser.close();
} finally {
  server?.kill();
}
