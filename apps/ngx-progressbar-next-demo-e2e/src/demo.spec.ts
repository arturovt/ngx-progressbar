import { expect, test } from './fixtures';

test('renders the demo and both progress bars', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1')).toContainText('Progressbar');
  // One bar in the app root driven by the router, one on the home page.
  await expect(page.locator('ng-progress')).toHaveCount(2);
});
