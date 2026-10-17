import { expect, test } from './fixtures';

test('the demo runs in the change detection mode of this project', async ({ page, zoneless }) => {
  await page.goto('/');

  // Zone mode loads zone.js on demand, so wait for it to appear.
  await expect.poll(() => page.evaluate(() => 'Zone' in window)).toBe(!zoneless);
});
