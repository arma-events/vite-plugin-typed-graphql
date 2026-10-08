import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/** Every supported Vite major is installed as an aliased copy (`vite6` as `npm:vite@6`, ...) */
const VITE_VERSIONS = ['6', '7', '8'];

/** Resolve the ESM entry point of an aliased Vite copy */
function resolveAliasedVite(version: string): string {
    const pkgDir = join(import.meta.dirname, 'node_modules', `vite${version}`);
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));

    // Vite 6: { import: string }, Vite 7+: string
    let entry = pkg.exports['.'];
    if (typeof entry !== 'string') entry = entry.import;

    return join(pkgDir, entry);
}

const CLI_TEST = 'test/cli.test.ts';

export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        // Suites chdir into fixture copies and the plugin keeps module-level state
        pool: 'forks',
        fileParallelism: false,
        testTimeout: 30000,
        // The whole suite runs once per supported Vite major: the plugin's and the tests' `import ... from 'vite'`
        // are redirected to the aliased copy, Vitest itself keeps using the root `vite`.
        // Run a single one with `vitest run --project vite7`.
        projects: [
            ...VITE_VERSIONS.map((version) => ({
                resolve: { alias: [{ find: /^vite$/, replacement: resolveAliasedVite(version) }] },
                test: {
                    name: `vite${version}`,
                    exclude: [CLI_TEST],
                    // checked by test/vite-version.test.ts
                    env: { VITE_VERSION: version }
                }
            })),
            {
                // The built CLI imports whatever `vite` is installed at the root, so it cannot be run against
                // an aliased Vite copy. It gets its own project without the alias.
                extends: false,
                test: {
                    name: 'cli',
                    include: [CLI_TEST],
                    pool: 'forks' as const,
                    fileParallelism: false,
                    testTimeout: 30000
                }
            }
        ]
    }
});
