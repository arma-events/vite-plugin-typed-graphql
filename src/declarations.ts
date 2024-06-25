import type { DocumentNode } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { writeFile } from 'fs/promises';
import { codegenTypedDocumentNode } from './utils';
import { readFile } from 'fs/promises';
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';

/**
 * Write type declarations file (`.d.ts`) for GraphQL operation file.
 *
 * This will only work for GraphQL operations. Use {@link writeSchemaDeclarations} instead
 * if you want to write type declarations for a GraphQL schema.
 *
 * @param path Path to GraphQL file
 * @param schema GraphQL Schema
 * @param schemaImports Imports from schema file (this will disable codegen for schema file)
 * @returns Contents of written file
 */
export async function writeOperationDeclarations(path: string, schema: DocumentNode, schemaImports = '') {
    // const operationSrc = await readFile(path, 'utf-8');

    // const [doc] = await loadDocuments(operationSrc, { loaders: [] });
    const [doc] = await loadDocuments(path, { loaders: [new GraphQLFileLoader()] });

    const typeScript = await codegenTypedDocumentNode(schema, doc, {
        operation: true,
        schema: schemaImports === '',
        typedDocNode: true
    });

    const contents = '/* eslint-disable */\n\n' + schemaImports + typeScript;

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
 * @returns Contents of written file
 */
export async function writeSchemaDeclarations(
    absPath: string,
    schema: DocumentNode,
    codegenTSPluginConfig?: TypeScriptPluginConfig
) {
    const typeScript = await codegenTypedDocumentNode(
        schema,
        undefined,
        { schema: true },
        { typescript: codegenTSPluginConfig }
    );

    const contents = '/* eslint-disable */\n\n' + typeScript;

    await writeFile(absPath + '.d.ts', contents, { encoding: 'utf-8' });

    return contents;
}
