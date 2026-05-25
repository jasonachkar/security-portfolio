import { mkdir } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

/** Route → screenshot filename. Routes are real URLs, so we deep-link directly. */
const pages = [
  ['/', 'start-here.png'],
  ['/architecture', 'architecture.png'],
  ['/gateway', 'gateway.png'],
  ['/assessment-pipeline', 'assessment-pipeline.png'],
  ['/network-telemetry', 'network-telemetry.png'],
  ['/azure-deployment', 'azure-deployment.png'],
  ['/evidence', 'evidence.png'],
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
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
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

  // Desktop captures, one per route.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  for (const [route, file] of pages) {
    await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    await desktop.waitForSelector('.surface-section, .hero', { state: 'visible' });
    await desktop.screenshot({ path: out(file), fullPage: true });
  }
  await desktop.close();

  // Mobile capture of the Start Here page.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobile.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await mobile.waitForSelector('.hero', { state: 'visible' });
  await mobile.screenshot({ path: out('mobile-start-here.png'), fullPage: true });
  await mobile.close();

  await browser.close();
} finally {
  server?.kill();
}
