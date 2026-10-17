import { ACTIVE, expect, labBar, labButton, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('start() activates the bar and complete() deactivates it', async ({ page }) => {
  const bar = labBar(page);
  await expect(bar).not.toHaveClass(ACTIVE);

  await labButton(page, 'start()').click();
  await expect(bar).toHaveClass(ACTIVE);

  await labButton(page, 'complete()').click();
  await expect(bar).not.toHaveClass(ACTIVE);
});

test('set(40) moves the bar to exactly 40 percent', async ({ page }) => {
  await labButton(page, 'set(40)').click();

  await expect(labBar(page).locator('.ng-bar')).toHaveAttribute('style', /translate3d\(40%/);
});

test('inc(20) adds to the current value', async ({ page }) => {
  const bar = labBar(page).locator('.ng-bar');

  // set() activates without starting the trickle timer, so 40 + 20 is exact.
  await labButton(page, 'set(40)').click();
  await expect(bar).toHaveAttribute('style', /translate3d\(40%/);

  await labButton(page, 'inc(20)').click();
  await expect(bar).toHaveAttribute('style', /translate3d\(60%/);
});

test('started and completed outputs fire', async ({ page }) => {
  const started = page.locator('span.chip', { hasText: 'started' });
  const completed = page.locator('span.chip', { hasText: 'completed' });

  await labButton(page, 'start()').click();
  await expect(started).toHaveClass(/changed/);

  await labButton(page, 'complete()').click();
  await expect(completed).toHaveClass(/changed/);
});
