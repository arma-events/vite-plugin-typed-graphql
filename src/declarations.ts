import type { DocumentNode } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { writeFile } from 'fs/promises';
import { codegenTypedDocumentNode } from './utils';
import { readFile } from 'fs/promises';

/**
 * Write type declarations file (`.d.ts`) for GraphQL operation file.
 *
 * This will only work for GraphQL operations. Use {@link writeSchemaDeclarations} instead
 * if you want to write type declarations for a GraphQL schema.
 *
 * @param path Path to GraphQL file
 * @param schema GraphQL Schema
 */
export async function writeOperationDeclarations(path: string, schema: DocumentNode) {
    const operationSrc = await readFile(path, 'utf-8');

    const [doc] = await loadDocuments(operationSrc, { loaders: [] });

    const typeScript = await codegenTypedDocumentNode(schema, doc, {
        operation: true,
        schema: true,
        typedDocNode: true
    });

    const contents = '/* eslint-disable */\n\n' + typeScript;

    await writeFile(path + '.d.ts', contents, { encoding: 'utf-8' });
}

/**
 * Write type declarations file (`.d.ts`) for GraphQL schema file.
 *
 * This will only work for GraphQL schemas. Use {@link writeOperationDeclarations} instead
 * if you want to write type declarations for a GraphQL operation.
 *
 * @param absPath Absolute path to GraphQL schema file
 * @param schema GraphQL Schema
 */
export async function writeSchemaDeclarations(absPath: string, schema: DocumentNode) {
    const typeScript = await codegenTypedDocumentNode(schema, undefined, { schema: true });

    const contents = '/* eslint-disable */\n\n' + typeScript;

    await writeFile(absPath + '.d.ts', contents, { encoding: 'utf-8' });
}
