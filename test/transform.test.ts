import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import typedGraphQL from '../src/index';
import { copyFixture, withCwd } from './helpers';

let dir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
    ({ dir, cleanup } = await copyFixture('basic'));
});

afterEach(() => cleanup());

// Minimal stand-in for the Rollup plugin context used by the transform hook
function makeContext() {
    return {
        resolve: vi.fn(async (source: string, importer: string) => ({ id: resolve(dirname(importer), source) })),
        addWatchFile: vi.fn()
    };
}

type TransformHook = (
    this: ReturnType<typeof makeContext>,
    code: string,
    id: string
) => Promise<{ code: string; map: null } | null>;

function transform(options: Parameters<typeof typedGraphQL>[0], id: string) {
    const plugin = typedGraphQL({ schemaPath: join(dir, 'schema.graphql'), ...options });
    const ctx = makeContext();
    const hook = plugin.transform as unknown as TransformHook;

    // the hook only uses the passed source to find `#import` lines and re-reads the file otherwise
    return {
        ctx,
        result: import('node:fs/promises')
            .then(({ readFile }) => readFile(id, 'utf-8'))
            .then((src) => hook.call(ctx, src, id))
    };
}

describe('transform hook', () => {
    it('ignores modules that are not GraphQL files', async () => {
        const { ctx, result } = transform({}, join(dir, 'main.ts'));

        expect(await result).toBeNull();
        expect(ctx.resolve).not.toHaveBeenCalled();
    });

    it('ignores excluded GraphQL files', async () => {
        const { ctx, result } = transform({ exclude: ['**/ignored/**'] }, join(dir, 'ignored', 'skip.graphql'));

        expect(await result).toBeNull();
        expect(ctx.resolve).not.toHaveBeenCalled();
    });

    it('handles .gql files with multiple operations and transitively imported fragments', async () => {
        const { result } = transform({}, join(dir, 'operations', 'users.gql'));
        const code = (await result)?.code;

        await expect(code).toMatchFileSnapshot('./snapshots/operations-users.gql.js');
    });

    it('registers directly imported fragment files as watch files', async () => {
        const { ctx, result } = transform({}, join(dir, 'operations', 'users.gql'));
        await result;

        // `#import FullUser from '../fragments/FullUser.graphql'`
        expect(ctx.addWatchFile).toHaveBeenCalledWith(join(dir, 'fragments', 'FullUser.graphql'));
    });

    it('registers transitively imported fragment files as watch files', async () => {
        const { ctx, result } = transform({}, join(dir, 'operations', 'users.gql'));
        await result;

        // users.gql -> fragments/FullUser.graphql -> { fragments/PostFields.graphql, fragments.graphql }
        expect(ctx.addWatchFile).toHaveBeenCalledWith(join(dir, 'fragments', 'PostFields.graphql'));
        expect(ctx.addWatchFile).toHaveBeenCalledWith(join(dir, 'fragments.graphql'));
        expect(ctx.addWatchFile).toHaveBeenCalledTimes(3);
    });
});

describe('plugin options', () => {
    it('defaults schemaPath to ./schema.graphql relative to cwd', async () => {
        const plugin = await withCwd(dir, async () => typedGraphQL());

        expect(plugin.name).toBe('typed-graphql');
    });
});
