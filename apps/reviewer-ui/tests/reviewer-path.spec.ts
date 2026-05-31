import { expect, test } from '@playwright/test';

const routes = [
  { path: '/lab', text: 'Choose a cloud model' },
  { path: '/threat-map', text: 'Global Threat Intelligence' },
  { path: '/network', text: 'Network Analyzer' },
  { path: '/scanner', text: 'Vulnerability Scanner' },
  { path: '/gateway', text: 'API Gateway' },
];

test.describe('five-tool navigation', () => {
  test('root redirects to infra lab', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/lab$/);
    await expect(page.getByText('Choose a cloud model')).toBeVisible();
  });

  for (const route of routes) {
    test(`deep-link renders ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByText(route.text).first()).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${route.path.replace('/', '\\/')}$`));
    });
  }

  test('nav links move across all live tools and browser history works', async ({ page }) => {
    await page.goto('/lab');
    const nav = page.getByRole('navigation', { name: 'Primary tool navigation' });

    await nav.getByRole('link', { name: 'Network Analyzer' }).click();
    await expect(page).toHaveURL(/\/network$/);
    await expect(page.getByText('Network Analyzer').first()).toBeVisible();

    await nav.getByRole('link', { name: 'API Gateway' }).click();
    await expect(page).toHaveURL(/\/gateway$/);
    await expect(page.getByText('API Gateway').first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/network$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/gateway$/);
  });

  test('infra lab supports cloud selection and validation controls', async ({ page }) => {
    await page.goto('/lab');
    await page.getByRole('button', { name: /^Azure Model Azure/ }).click();
    await expect(page.getByText('Multi-cloud security posture canvas')).toBeVisible();
    await page.getByRole('button', { name: /Add AZURE Blob Storage/ }).click();
    await page.getByRole('button', { name: /^Validate$/ }).click();
    await expect(page.getByText('Security Findings')).toBeVisible();
  });

  test('no body horizontal overflow across mobile, laptop, and desktop', async ({ page }) => {
    test.setTimeout(90_000);
    const viewports = [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'laptop', width: 1366, height: 768 },
      { name: 'desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of routes) {
        await page.goto(route.path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(overflow, `${viewport.name} overflow on ${route.path}`).toBe(false);
      }
    }
  });
});
