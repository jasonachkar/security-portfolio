import { expect, test } from '@playwright/test';

const pages = [
  'Start Here',
  'Architecture',
  'Secure Gateway',
  'Assessment Pipeline',
  'Network Telemetry',
  'Azure Deployment',
  'Evidence',
];

test('five minute reviewer path renders key pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Defensive Security Platform Lab' }).first()).toBeVisible();

  for (const label of pages.slice(1)) {
    await page.getByLabel('Main navigation').getByRole('button', { name: label }).click();
    await expect(page.getByRole('heading', { name: label }).first()).toBeVisible();
  }
});

test('layout has no body horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('demo and limitation language is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('allowlisted targets only')).toBeVisible();
  await page.getByRole('button', { name: 'Azure Deployment' }).click();
  await expect(page.getByText('demo/sample mode')).toBeVisible();
});
