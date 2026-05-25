import { defineConfig, devices } from '@playwright/test';

// Dedicated port so e2e always tests a fresh Vite dev server with the current
// build, never a reused container (e.g. the local Docker lab on :5173).
const PORT = Number(process.env.REVIEWER_UI_E2E_PORT ?? 5191);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
