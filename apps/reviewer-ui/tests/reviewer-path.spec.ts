import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', heading: 'Defensive Security Platform Lab' },
  { path: '/architecture', heading: 'Architecture' },
  { path: '/gateway', heading: 'Secure Gateway' },
  { path: '/assessment-pipeline', heading: 'Assessment Pipeline' },
  { path: '/network-telemetry', heading: 'Network Telemetry' },
  { path: '/azure-deployment', heading: 'Azure Deployment' },
  { path: '/evidence', heading: 'Evidence' },
];

test.describe('deep-linkable routes', () => {
  for (const route of routes) {
    test(`deep-link renders ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1, name: route.heading }).first()).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${route.path === '/' ? '/$' : route.path.replace('/', '\\/')}`));
    });
  }
});

test('sidebar links navigate and browser history works', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });

  await nav.getByRole('link', { name: 'Secure Gateway' }).click();
  await expect(page).toHaveURL(/\/gateway$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Secure Gateway' })).toBeVisible();

  await nav.getByRole('link', { name: 'Evidence' }).click();
  await expect(page).toHaveURL(/\/evidence$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/gateway$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/evidence$/);
});

test('proof links are real GitHub anchors that open in a new tab', async ({ page }) => {
  await page.goto('/gateway');
  const link = page.locator('a.proof-link', { hasText: 'apps/gateway/test/gateway.test.ts' }).first();
  await expect(link).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/jasonachkar\/security-portfolio\/blob\/refactor\/defensive-security-platform-lab\/apps\/gateway\/test\/gateway\.test\.ts$/,
  );
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noreferrer/);
});

test('honest, demo-first language is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Allowlisted targets only').first()).toBeVisible();

  await page.goto('/azure-deployment');
  await expect(page.getByText('not a live production deployment').first()).toBeVisible();
});

test('no body horizontal overflow across mobile, laptop, and desktop', async ({ page }) => {
  test.setTimeout(90_000);
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      await page.goto(route.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${viewport.name} overflow on ${route.path}`).toBe(false);
    }
  }
});
