import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Resolve the ESM entry point of an aliased Vite copy (e.g. `vite5`, installed as `npm:vite@5`).
 *
 * Set `VITE_VERSION=5` to run the whole test suite against that copy. Vitest itself keeps using
 * the root `vite`, only the plugin's and the tests' `import ... from 'vite'` are redirected.
 */
function resolveAliasedVite(version: string): string {
    const pkgDir = join(import.meta.dirname, 'node_modules', `vite${version}`);
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));

    // Vite 4: { import: string }, Vite 5: { import: { default: string } }, Vite 6: { import: string }, Vite 7+: string
    let entry = pkg.exports['.'];
    if (typeof entry !== 'string') entry = entry.import;
    if (typeof entry !== 'string') entry = entry.default;

    return join(pkgDir, entry);
}

const viteVersion = process.env.VITE_VERSION;

export default defineConfig({
    resolve: {
        alias: viteVersion ? [{ find: /^vite$/, replacement: resolveAliasedVite(viteVersion) }] : []
    },
    test: {
        include: ['test/**/*.test.ts'],
        // Suites chdir into fixture copies and the plugin keeps module-level state
        pool: 'forks',
        fileParallelism: false,
        testTimeout: 30000
    }
});
