import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

// Copies live inside the repo (same depth as `test/fixtures/<name>`) so that
// relative imports in fixture files and Node's module resolution keep working.
const TMP_DIR = join(import.meta.dirname, '.tmp');

/**
 * Copy a fixture directory to a fresh temporary directory.
 * The plugin writes `.d.ts` files next to the sources, so tests never run on the checked-in fixture.
 */
export async function copyFixture(name: string): Promise<{ dir: string; cleanup: () => Promise<void> }> {
    await mkdir(TMP_DIR, { recursive: true });
    const dir = await mkdtemp(join(TMP_DIR, `${name}-`));
    await cp(join(FIXTURES_DIR, name), dir, { recursive: true });

    return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/** Run `fn` with `process.cwd()` set to `dir`. The plugin resolves the schema and globs for GraphQL files relative to cwd. */
export async function withCwd<T>(dir: string, fn: () => Promise<T>): Promise<T> {
    const previous = process.cwd();
    process.chdir(dir);
    try {
        return await fn();
    } finally {
        process.chdir(previous);
    }
}

/** Read the declaration file generated for `<dir>/<file>`. */
export function readDts(dir: string, file: string): Promise<string> {
    return readFile(join(dir, `${file}.d.ts`), 'utf-8');
}
