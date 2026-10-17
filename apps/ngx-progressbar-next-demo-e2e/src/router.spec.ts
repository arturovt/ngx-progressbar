import { ACTIVE, expect, rootBar, test } from './fixtures';

test('the root bar runs while the router loads a lazy route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Test Http Request' })).toBeVisible();

  // Hold the lazy chunk. Without this the route can load before we look.
  await page.route('**/chunk-*.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.continue();
  });

  const bar = rootBar(page);
  await expect(bar).not.toHaveClass(ACTIVE);

  await page.getByRole('link', { name: 'Custom' }).click();
  await expect(bar).toHaveClass(ACTIVE);

  await expect(bar).not.toHaveClass(ACTIVE, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/custom$/);
});
