import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizePath } from 'vite';
import type { DocumentNode } from 'graphql';
import { writeOperationDeclarations, writeSchemaDeclarations } from '../src/declarations';
import { DeclarationWriter } from '../src/declarations_writer';
import { loadSchemaDocument } from '../src/utils';
import { copyFixture, readDts, withCwd } from './helpers';

let dir: string;
let cleanup: () => Promise<void>;
let schemaPath: string;
let schema: DocumentNode;

beforeEach(async () => {
    ({ dir, cleanup } = await copyFixture('basic'));
    schemaPath = normalizePath(join(dir, 'schema.graphql'));
    schema = loadSchemaDocument(schemaPath);
});

afterEach(() => cleanup());

describe('writeSchemaDeclarations', () => {
    it('writes schema.graphql.d.ts with the default header', async () => {
        const contents = await writeSchemaDeclarations(schemaPath, schema);
        const written = await readDts(dir, 'schema.graphql');

        expect(written).toBe(contents);
        expect(written.startsWith('/* eslint-disable */\n\n')).toBe(true);
        expect(written).toContain('export type User = {');
    });

    it('honours schemaDeclarationFileHeader', async () => {
        await writeSchemaDeclarations(schemaPath, schema, { schemaDeclarationFileHeader: '// custom\n' });

        expect((await readDts(dir, 'schema.graphql')).startsWith('// custom\nexport')).toBe(true);
    });
});

describe('writeOperationDeclarations', () => {
    const queries = () => join(dir, 'queries.graphql');

    it('inlines schema types when no schema imports are given', async () => {
        await writeOperationDeclarations(queries(), schema);
        const written = await readDts(dir, 'queries.graphql');

        expect(written.startsWith('/* eslint-disable */\n\n')).toBe(true);
        expect(written).toContain('export type User = {');
        expect(written).toContain('export type GetUserQuery = ');
        expect(written).toContain('export declare const GetUser: DocumentNode<GetUserQuery, GetUserQueryVariables>;');
    });

    it('imports schema types instead of inlining them when schema imports are given', async () => {
        const imports = "import { Scalars, User } from './schema.graphql';\n";
        await writeOperationDeclarations(queries(), schema, {}, imports);
        const written = await readDts(dir, 'queries.graphql');

        expect(written).toContain(imports);
        expect(written).not.toContain('export type User = {');
        expect(written).toContain('export type GetUserQuery = ');
    });

    it('honours operationDeclarationFileHeader', async () => {
        await writeOperationDeclarations(queries(), schema, { operationDeclarationFileHeader: '// ops\n' });

        expect((await readDts(dir, 'queries.graphql')).startsWith('// ops\n')).toBe(true);
    });
});

describe('DeclarationWriter.writeDeclarationsForAllGQLFiles', () => {
    it('writes declarations for the schema and every operation file', async () => {
        const writer = new DeclarationWriter(schemaPath, schema);
        await withCwd(dir, () => writer.writeDeclarationsForAllGQLFiles());

        expect(existsSync(join(dir, 'schema.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'fragments.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'ignored', 'skip.graphql.d.ts'))).toBe(true);
        // the schema must not be treated as an operation file
        expect(existsSync(join(dir, 'schema.graphql.d.ts.d.ts'))).toBe(false);

        // operation files import the schema types instead of inlining them
        await expect(await readDts(dir, 'queries.graphql')).toMatchFileSnapshot('./snapshots/queries.graphql.d.ts');
        await expect(await readDts(dir, 'fragments.graphql')).toMatchFileSnapshot('./snapshots/fragments.graphql.d.ts');
    });

    it('imports the schema via a relative path for operation files next to the schema', async () => {
        const writer = new DeclarationWriter(schemaPath, schema);
        await withCwd(dir, () => writer.writeDeclarationsForAllGQLFiles());

        expect(await readDts(dir, 'queries.graphql')).toContain("from './schema.graphql';");
    });

    it('uses a relative path to the schema for nested operation files', async () => {
        const writer = new DeclarationWriter(schemaPath, schema);
        await withCwd(dir, () => writer.writeDeclarationsForAllGQLFiles());

        await expect(await readDts(dir, 'ignored/skip.graphql')).toMatchFileSnapshot(
            './snapshots/ignored-skip.graphql.d.ts'
        );
        // .gql files, multiple operations per file, transitive fragment imports
        await expect(await readDts(dir, 'operations/users.gql')).toMatchFileSnapshot(
            './snapshots/operations-users.gql.d.ts'
        );
    });

    it('respects the exclude option', async () => {
        const writer = new DeclarationWriter(schemaPath, schema, { exclude: ['**/ignored/**'] });
        await withCwd(dir, () => writer.writeDeclarationsForAllGQLFiles());

        expect(existsSync(join(dir, 'queries.graphql.d.ts'))).toBe(true);
        expect(existsSync(join(dir, 'ignored', 'skip.graphql.d.ts'))).toBe(false);
    });
});
