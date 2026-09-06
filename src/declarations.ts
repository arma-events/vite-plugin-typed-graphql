import type { DocumentNode } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { writeFile } from 'fs/promises';
import { codegenTypedDocumentNode } from './utils';
import { GraphQLPluginOptions } from '.';

// `export const Foo = { ...document... } as unknown as DocumentNode<Result, Variables>;`
const TYPED_DOCUMENT_CONST = /^export const (\w+) = .+ as unknown as (DocumentNode<.+>);$/gm;

/**
 * Codegen emits typed document nodes as initialized constants, which is invalid in a
 * declaration file (TS1254). Rewrite them to `export declare const Foo: DocumentNode<...>;`.
 */
function toAmbientDeclarations(typeScript: string): string {
    return typeScript.replace(TYPED_DOCUMENT_CONST, 'export declare const $1: $2;');
}

/**
 * Write type declarations file (`.d.ts`) for GraphQL operation file.
 *
 * This will only work for GraphQL operations. Use {@link writeSchemaDeclarations} instead
 * if you want to write type declarations for a GraphQL schema.
 *
 * @param path Path to GraphQL file
 * @param schema GraphQL Schema
 * @param options Plugin options (will be used to calculate config for codegen plugins)
 * @param schemaImportPath Module specifier of the schema declarations relative to `path`. If given,
 *                         enums are imported from there instead of being redeclared.
 * @returns Contents of written file
 */

export async function writeOperationDeclarations(
    path: string,
    schema: DocumentNode,
    options: GraphQLPluginOptions = {},
    schemaImportPath?: string
) {
    const [doc] = await loadDocuments(path, { loaders: [new GraphQLFileLoader()] });

    const typeScript = await codegenTypedDocumentNode(
        schema,
        doc,
        { operation: true, typedDocNode: true },
        options,
        schemaImportPath
    );

    const contents =
        (options.operationDeclarationFileHeader ?? '/* eslint-disable */\n\n') + toAmbientDeclarations(typeScript);

    await writeFile(path + '.d.ts', contents, { encoding: 'utf-8' });

    return contents;
}

/**
 * Write type declarations file (`.d.ts`) for GraphQL schema file.
 *
 * This will only work for GraphQL schemas. Use {@link writeOperationDeclarations} instead
 * if you want to write type declarations for a GraphQL operation.
 *
 * @param absPath Absolute path to GraphQL schema file
 * @param schema GraphQL Schema
 * @param options Plugin options (will be used to calculate config for codegen plugin options)
 * @returns Contents of written file
 */
export async function writeSchemaDeclarations(
    absPath: string,
    schema: DocumentNode,
    options: GraphQLPluginOptions = {}
) {
    const typeScript = await codegenTypedDocumentNode(schema, undefined, { schema: true }, options);

    const contents = (options.schemaDeclarationFileHeader ?? '/* eslint-disable */\n\n') + typeScript;

    await writeFile(absPath + '.d.ts', contents, { encoding: 'utf-8' });

    return contents;
}
