import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { copyFixture } from './helpers';

const exec = promisify(execFile);
const BIN = join(import.meta.dirname, '..', 'dist', 'build-gql-declarations.mjs');

let dir: string;
let cleanup: () => Promise<void>;

// The built CLI imports whatever `vite` is installed at the root, so it cannot
// be run against an aliased Vite copy (see vitest.config.ts).
describe.skipIf(process.env.VITE_VERSION !== undefined)('build-gql-declarations CLI', () => {
    beforeAll(() => {
        if (!existsSync(BIN)) throw new Error(`${BIN} does not exist, run "npm run build" first`);
    });

    beforeEach(async () => {
        ({ dir, cleanup } = await copyFixture('basic'));
    });

    afterEach(() => cleanup());

    function run(...args: string[]) {
        return exec(process.execPath, [BIN, ...args], { cwd: dir });
    }

    it('writes declarations using the plugin options from vite.config.ts', async () => {
        const { stdout } = await run();

        expect(stdout).toContain('Wrote all GraphQL declarations');
        expect(existsSync(join(dir, 'schema.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'fragments.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'operations', 'users.gql.d.ts'))).toBe(true);
        // excluded via vite.config.ts
        expect(existsSync(join(dir, 'ignored', 'skip.graphql.d.ts'))).toBe(false);
    });

    it('finds the plugin in a function-form config with nested and falsy plugin entries', async () => {
        await writeFile(
            join(dir, 'vite.config.ts'),
            [
                "import { defineConfig } from 'vite';",
                "import typedGraphQL from '../../../src/index';",
                'export default defineConfig(() => ({',
                "    plugins: [false, undefined, null, [false, typedGraphQL({ exclude: ['**/ignored/**'] })]]",
                '}));',
                ''
            ].join('\n')
        );

        await run();

        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'ignored', 'skip.graphql.d.ts'))).toBe(false);
    });

    it('works without a vite config', async () => {
        await rm(join(dir, 'vite.config.ts'));

        const { stdout } = await run();

        expect(stdout).toContain('Wrote all GraphQL declarations');
        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(true);
        // no exclude without a config
        expect(existsSync(join(dir, 'ignored', 'skip.graphql.d.ts'))).toBe(true);
    });

    it('lets CLI arguments override the vite config', async () => {
        await run('--include', 'ignored/**', '--exclude', 'nothing/**');

        expect(existsSync(join(dir, 'ignored', 'skip.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(false);
    });

    it('fails when the schema cannot be found', async () => {
        await expect(run('--schema', './missing.graphql')).rejects.toThrow(/ENOENT/);
    });
});
