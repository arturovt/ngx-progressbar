import { expect, labBar, test, waitUntilInteractive } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // The option inputs use ngModel. A change sent before hydration is lost.
  await waitUntilInteractive(page);
});

test('the spinner option adds and removes the spinner', async ({ page }) => {
  const spinner = labBar(page).locator('.ng-spinner');
  await expect(spinner).toBeAttached();

  await page.locator('input[name="showSpinner"]').uncheck();
  await expect(spinner).toHaveCount(0);
});

test('the flat option removes the meteor', async ({ page }) => {
  const meteor = labBar(page).locator('.ng-meteor');
  await expect(meteor).toBeAttached();

  await page.locator('input[name="flat"]').check();
  await expect(meteor).toHaveCount(0);
});
