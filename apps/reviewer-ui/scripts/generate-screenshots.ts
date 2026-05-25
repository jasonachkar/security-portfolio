import { mkdir } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const pages = [
  ['start', 'Start Here'],
  ['architecture', 'Architecture'],
  ['gateway', 'Secure Gateway'],
  ['pipeline', 'Assessment Pipeline'],
  ['network', 'Network Telemetry'],
  ['azure', 'Azure Deployment'],
  ['evidence', 'Evidence'],
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

try {
  await waitForServer(baseUrl);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(baseUrl);

  for (const [id, label] of pages) {
    if (id !== 'start') {
      await page.getByLabel('Main navigation').getByRole('button', { name: label }).click();
    }
    await page.screenshot({ path: fileURLToPath(new URL(`${id}.png`, outputDir)), fullPage: true });
  }

  await browser.close();
} finally {
  server?.kill();
}
