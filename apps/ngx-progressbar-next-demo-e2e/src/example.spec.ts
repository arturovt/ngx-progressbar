import { expect, test } from '@playwright/test';

test('renders the demo and both progress bars', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1')).toContainText('Progressbar');
  // One bar in the app root driven by the router, one on the home page.
  await expect(page.locator('ng-progress')).toHaveCount(2);
});

test('the router bar completes after navigating to the custom page', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Custom' }).click();

  await expect(page).toHaveURL(/\/custom$/);
  await expect(page.locator('ng-progress.root-progress-bar')).not.toHaveClass(
    /ng-progress-bar-active/
  );
});
