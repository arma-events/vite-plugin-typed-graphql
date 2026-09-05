import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadDocuments } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { codegenTypedDocumentNode, loadSchemaDocument, typescriptToJavascript } from '../src/utils';
import type { GraphQLPluginOptions } from '../src/index';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'basic');
const schema = loadSchemaDocument(join(FIXTURE, 'schema.graphql'));

describe('codegenTypedDocumentNode', () => {
    it('generates schema types', async () => {
        const ts = await codegenTypedDocumentNode(schema, undefined, { schema: true });

        await expect(ts).toMatchFileSnapshot('./snapshots/codegen-schema.ts');
    });

    it('generates operation types and a typed document node', async () => {
        const [doc] = await loadDocuments(join(FIXTURE, 'queries.graphql'), { loaders: [new GraphQLFileLoader()] });
        const ts = await codegenTypedDocumentNode(schema, doc, { operation: true, typedDocNode: true });

        await expect(ts).toMatchFileSnapshot('./snapshots/codegen-operation.ts');
    });

    describe('scalar options', () => {
        async function dateTimeScalar(options: GraphQLPluginOptions): Promise<string | undefined> {
            const ts = await codegenTypedDocumentNode(schema, undefined, { schema: true }, options);
            return ts.match(/DateTime: \{ .*? \}/)?.[0];
        }

        it('defaults unknown scalars to `unknown`', async () => {
            expect(await dateTimeScalar({})).toBe('DateTime: { input: unknown; output: unknown; }');
        });

        it('applies defaultScalarType', async () => {
            expect(await dateTimeScalar({ defaultScalarType: 'any' })).toBe('DateTime: { input: any; output: any; }');
        });

        it('applies scalars given as string', async () => {
            expect(await dateTimeScalar({ scalars: { DateTime: 'Date' } })).toBe(
                'DateTime: { input: Date; output: Date; }'
            );
        });

        it('applies scalars given as input/output object', async () => {
            expect(await dateTimeScalar({ scalars: { DateTime: { input: 'Date | string', output: 'string' } } })).toBe(
                'DateTime: { input: Date | string; output: string; }'
            );
        });

        it('throws for unmapped scalars when strictScalars is set', async () => {
            await expect(dateTimeScalar({ strictScalars: true })).rejects.toThrow(/DateTime/);
        });

        it('prefers plugin options over codegenPluginConfigs', async () => {
            const options: GraphQLPluginOptions = {
                defaultScalarType: 'string',
                codegenPluginConfigs: { typescript: { defaultScalarType: 'number' } }
            };

            expect(await dateTimeScalar(options)).toBe('DateTime: { input: string; output: string; }');
        });

        it('falls back to codegenPluginConfigs when plugin options are unset', async () => {
            const options: GraphQLPluginOptions = {
                codegenPluginConfigs: { typescript: { defaultScalarType: 'number' } }
            };

            expect(await dateTimeScalar(options)).toBe('DateTime: { input: number; output: number; }');
        });
    });
});

describe('codegenPluginConfigs passthrough', () => {
    it('passes typescript plugin options through', async () => {
        const withEnums = await codegenTypedDocumentNode(schema, undefined, { schema: true });
        const asTypes = await codegenTypedDocumentNode(
            schema,
            undefined,
            { schema: true },
            {
                codegenPluginConfigs: { typescript: { enumsAsTypes: true } }
            }
        );

        expect(withEnums).toContain('export enum Role {');
        expect(asTypes).not.toContain('export enum Role {');
        expect(asTypes).toContain('export type Role =');
    });

    it('passes typescript-operations plugin options through', async () => {
        const [doc] = await loadDocuments(join(FIXTURE, 'queries.graphql'), { loaders: [new GraphQLFileLoader()] });
        const withTypename = await codegenTypedDocumentNode(schema, doc, { operation: true });
        const withoutTypename = await codegenTypedDocumentNode(
            schema,
            doc,
            { operation: true },
            {
                codegenPluginConfigs: { typescriptOperations: { skipTypename: true } }
            }
        );

        expect(withTypename).toContain('__typename');
        expect(withoutTypename).not.toContain('__typename');
    });
});

describe('typescriptToJavascript', () => {
    it('strips types and keeps runtime code', async () => {
        const js = await typescriptToJavascript('export type Foo = string;\nexport const foo: Foo = "bar";\n');

        expect(js).toContain('export const foo = "bar";');
        expect(js).not.toContain('Foo');
    });
});
