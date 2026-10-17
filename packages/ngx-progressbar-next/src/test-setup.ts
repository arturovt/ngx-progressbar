import { afterEach, vi } from 'vitest';

// Jasmine restored spies after every spec. Vitest keeps them, so a stub
// from one test would leak into the next one.
afterEach(() => {
  vi.restoreAllMocks();
});
