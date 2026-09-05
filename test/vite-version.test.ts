import { expect, it } from 'vitest';
import { version } from 'vite';

// Guards the VITE_VERSION alias in vitest.config.ts: if it silently stopped working,
// the whole matrix would test the root `vite` and this test would fail.
it(`runs against vite ${version}`, () => {
    const expected = process.env.VITE_VERSION;
    if (expected !== undefined) expect(version.split('.')[0]).toBe(expected);
});
