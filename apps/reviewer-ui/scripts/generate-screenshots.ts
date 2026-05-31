import { mkdir } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const pages = [
  ['/lab', 'infra-lab.png'],
  ['/threat-map', 'threat-map.png'],
  ['/network', 'network-analyzer.png'],
  ['/scanner', 'vulnerability-scanner.png'],
  ['/gateway', 'api-gateway.png'],
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
      if (response.ok) return;
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

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  for (const [route, file] of pages) {
    await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
    await desktop.evaluate((nextRoute) => {
      window.history.pushState({}, '', nextRoute);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, route);
    await desktop.waitForSelector('body', { state: 'visible' });
    await desktop.waitForTimeout(900);
    await desktop.screenshot({ path: out(file), fullPage: true });
  }
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.evaluate(() => {
    window.history.pushState({}, '', '/lab');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await mobile.waitForSelector('body', { state: 'visible' });
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: out('mobile-infra-lab.png'), fullPage: true });
  await mobile.close();

  await browser.close();
} finally {
  server?.kill();
}
