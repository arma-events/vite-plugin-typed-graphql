import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'vite';
import typedGraphQL from '../src/index';
import { copyFixture, readDts, withCwd } from './helpers';

let dir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
    ({ dir, cleanup } = await copyFixture('basic'));
});

afterEach(() => cleanup());

async function buildFixture(): Promise<string> {
    const result = await withCwd(dir, () =>
        build({
            root: dir,
            configFile: false,
            logLevel: 'silent',
            plugins: [typedGraphQL({ schemaPath: join(dir, 'schema.graphql') })],
            build: {
                write: false,
                minify: false,
                lib: { entry: 'main.ts', formats: ['es'], fileName: 'main' }
            }
        })
    );

    // depending on the Vite version a single output or an array of outputs is returned
    const outputs = (Array.isArray(result) ? result : [result]) as unknown as { output: { code: string }[] }[];
    return outputs[0].output[0].code;
}

describe('vite build', () => {
    it('transforms .graphql imports into typed document nodes', async () => {
        const code = await buildFixture();

        expect(code).toContain('GetUser');
        expect(code).toContain('GetFullUser');
        expect(code).toContain('RenameUser');
        expect(code).toContain('UserChanged');
        expect(code).toContain('"OperationDefinition"');
        // the `#import`ed fragment is inlined into the document
        expect(code).toContain('"FragmentDefinition"');
        expect(code).toContain('"UserFields"');
        expect(code).not.toContain('#import');
    });

    it('writes declaration files on buildStart', async () => {
        await buildFixture();

        expect(existsSync(join(dir, 'schema.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'fragments.graphql.d.ts'))).toBe(true);
        expect(await readDts(dir, 'queries.graphql')).toContain('export declare const GetUser: DocumentNode<');
    });

    it('throws a descriptive error when the schema cannot be loaded', () => {
        expect(() => typedGraphQL({ schemaPath: join(dir, 'missing.graphql') })).toThrow(
            /Failed to load GraphQL schema at ".*missing\.graphql"/
        );
    });
});
