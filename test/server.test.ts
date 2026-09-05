import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer, normalizePath, type HmrContext, type Plugin, type ViteDevServer } from 'vite';
import typedGraphQL from '../src/index';
import { copyFixture, readDts } from './helpers';

let dir: string;
let cleanup: () => Promise<void>;
let previousCwd: string;
let server: ViteDevServer;
let plugin: Plugin;

beforeEach(async () => {
    ({ dir, cleanup } = await copyFixture('basic'));

    // the plugin resolves the schema and globs GraphQL files relative to cwd
    previousCwd = process.cwd();
    process.chdir(dir);

    plugin = typedGraphQL({ schemaPath: join(dir, 'schema.graphql') });
    server = await createServer({
        root: dir,
        configFile: false,
        logLevel: 'silent',
        server: { middlewareMode: true, watch: null },
        plugins: [plugin]
    });
});

afterEach(async () => {
    await server.close();
    process.chdir(previousCwd);
    await cleanup();
});

function hotUpdate(file: string): Promise<void> {
    const handler = plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>;

    return handler({
        file,
        timestamp: Date.now(),
        modules: [],
        read: () => readFile(file, 'utf-8'),
        server
    });
}

async function replaceInFile(file: string, search: string, replacement: string): Promise<void> {
    const contents = await readFile(file, 'utf-8');
    expect(contents).toContain(search);
    await writeFile(file, contents.replace(search, replacement));
}

describe('vite dev server', () => {
    it('transforms .graphql requests into typed document nodes', async () => {
        const result = await server.transformRequest('/queries.graphql');

        await expect(result?.code).toMatchFileSnapshot('./snapshots/queries.graphql.js');
    });

    it('reloads the schema, invalidates transformed modules and triggers a full reload on schema change', async () => {
        const queriesId = normalizePath(join(dir, 'queries.graphql'));
        const schemaPath = join(dir, 'schema.graphql');

        await server.transformRequest('/queries.graphql');
        const mod = server.moduleGraph.getModuleById(queriesId);
        expect(mod?.transformResult).not.toBeNull();

        const send = vi.spyOn(server.ws, 'send');
        await replaceInFile(schemaPath, 'name: String!', 'name: String!\n    email: String');
        await hotUpdate(schemaPath);

        expect(send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' });
        expect(mod?.transformResult).toBeNull();
        expect(await readDts(dir, 'schema.graphql')).toContain('email?: Maybe<');
        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(true);
    });

    it('rewrites the declaration file of a changed operation file', async () => {
        const queriesPath = join(dir, 'queries.graphql');

        await replaceInFile(queriesPath, 'query GetUser(', 'query GetUserById(');
        await hotUpdate(queriesPath);

        const dts = await readDts(dir, 'queries.graphql');
        expect(dts).toContain('export declare const GetUserById: DocumentNode<');
        expect(dts).not.toContain('export declare const GetUser: ');
    });

    it('ignores hot updates of files that are not GraphQL files', async () => {
        const mainPath = join(dir, 'main.ts');

        await hotUpdate(mainPath);

        expect(existsSync(`${mainPath}.d.ts`)).toBe(false);
    });

    it('ignores hot updates of excluded GraphQL files', async () => {
        plugin = typedGraphQL({ schemaPath: join(dir, 'schema.graphql'), exclude: ['**/ignored/**'] });
        const skipPath = join(dir, 'ignored', 'skip.graphql');
        // remove the file written by buildStart of the server's plugin instance
        await rm(`${skipPath}.d.ts`);

        await hotUpdate(skipPath);

        expect(existsSync(`${skipPath}.d.ts`)).toBe(false);
    });

    it('does not write declaration files when generateDeclarations is false', async () => {
        plugin = typedGraphQL({ schemaPath: join(dir, 'schema.graphql'), generateDeclarations: false });
        const queriesPath = join(dir, 'queries.graphql');
        // remove the file written by buildStart of the server's plugin instance
        await rm(`${queriesPath}.d.ts`);

        await hotUpdate(queriesPath);

        expect(existsSync(`${queriesPath}.d.ts`)).toBe(false);
    });
});
