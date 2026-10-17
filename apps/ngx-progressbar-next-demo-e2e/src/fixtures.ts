import { expect, Locator, Page, test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export const ACTIVE = /ng-progress-bar-active/;

/** Hosts the demo pulls fonts, badges and widgets from. */
const THIRD_PARTY =
  /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|buttons\.github\.io|img\.shields\.io)\//;

/** A 1x1 transparent PNG. */
const IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

export interface E2EOptions {
  /** Runs the demo without `zone.js` and with zoneless change detection. */
  zoneless: boolean;
}

export const test = base.extend<E2EOptions>({
  zoneless: [true, { option: true }],

  page: async ({ page, zoneless }, use) => {
    // The tests must not depend on the network. These hosts also rate
    // limit, which made the console error check fail at random.
    await page.route(THIRD_PARTY, route => {
      switch (route.request().resourceType()) {
        case 'script':
          return route.fulfill({ contentType: 'application/javascript', body: '' });
        case 'stylesheet':
          return route.fulfill({ contentType: 'text/css', body: '' });
        case 'image':
          return route.fulfill({ contentType: 'image/png', body: IMAGE });
        default:
          return route.fulfill({ contentType: 'text/plain', body: '' });
      }
    });

    // The demo calls this host when the Test Http Request button is pressed.
    await page.route('https://reqres.in/api/users**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      })
    );

    // The app reads this flag in src/main.ts before it starts.
    await page.addInitScript(value => {
      (window as { __zoneless?: boolean }).__zoneless = value;
    }, zoneless);

    // A hydration mismatch only logs NG0500 and falls back to client
    // rendering, so the tests would still pass. Fail on it instead.
    const errors: string[] = [];
    page.on('console', message => {
      // Resource failures come from the network, not from the app.
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        errors.push(message.text());
      }
    });
    page.on('pageerror', error => errors.push(error.message));

    await use(page);

    if (errors.length > 0) {
      throw new Error(`The page logged errors:\n${errors.join('\n')}`);
    }
  }
});

/** The bar on the home page, driven by the buttons and by HttpClient. */
export function labBar(page: Page): Locator {
  return page.locator('.progressbar-container ng-progress');
}

/** The bar in the app root, driven by router events. */
export function rootBar(page: Page): Locator {
  return page.locator('ng-progress.root-progress-bar');
}

/** The play button in the table row that documents the given call. */
export function labButton(page: Page, call: string): Locator {
  return page.locator('tr', { hasText: call }).getByRole('button');
}

/**
 * Wait until the client controls the page. There is no DOM flag for
 * finished hydration, so prove it with a click that has a visible effect.
 */
export async function waitUntilInteractive(page: Page): Promise<void> {
  await labButton(page, 'start()').click();
  await expect(labBar(page)).toHaveClass(ACTIVE);

  await labButton(page, 'complete()').click();
  await expect(labBar(page)).not.toHaveClass(ACTIVE);
}
