import { ACTIVE, expect, labBar, test } from './fixtures';

test('the interceptor runs the bar for the duration of a request', async ({ page }) => {
  let release: () => void = () => undefined;
  const held: Promise<void> = new Promise<void>(resolve => {
    release = resolve;
  });

  // This route wins over the one in the fixture. Holding the response
  // keeps the active state from being a race.
  await page.route('https://reqres.in/api/users**', async route => {
    await held;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });

  await page.goto('/');

  const bar = labBar(page);
  await expect(bar).not.toHaveClass(ACTIVE);

  await page.getByRole('button', { name: 'Test Http Request' }).click();
  await expect(bar).toHaveClass(ACTIVE);

  release();
  await expect(bar).not.toHaveClass(ACTIVE);
});
