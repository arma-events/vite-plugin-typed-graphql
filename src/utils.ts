import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import * as typedDocumentNodePlugin from '@graphql-codegen/typed-document-node';
import { transform } from 'esbuild';
import { parse, DocumentNode } from 'graphql';
import { readFileSync } from 'fs';
import { codegen } from '@graphql-codegen/core';
import { Types } from '@graphql-codegen/plugin-helpers';

export function loadSchemaDocument(path: string): DocumentNode {
    return parse(readFileSync(path, 'utf-8'));
}

export async function codegenTypedDocumentNode(
    schema: DocumentNode,
    doc?: Types.DocumentFile,
    enablePlugins: {
        schema?: boolean;
        operation?: boolean;
        typedDocNode?: boolean;
    } = { schema: true, operation: true, typedDocNode: true }
): Promise<string> {
    const plugins: Types.ConfiguredPlugin[] = [];

    if (enablePlugins.schema) plugins.push({ typescript: {} });
    if (enablePlugins.operation) plugins.push({ typescriptOperations: {} });
    if (enablePlugins.typedDocNode) plugins.push({ typedDocumentNode: {} });

    const ts = await codegen({
        documents: doc ? [doc] : [],
        config: {},
        // used by a plugin internally, although the 'typescript' plugin currently
        // returns the string output, rather than writing to a file
        filename: './node_modules/.vite/graphql.ts',
        schema,
        plugins,
        pluginMap: {
            typescript: typescriptPlugin,
            typescriptOperations: typescriptOperationPlugin,
            typedDocumentNode: typedDocumentNodePlugin
        }
    });

    return ts;
}

export async function typescriptToJavascript(ts: string): Promise<string> {
    const { code } = await transform(ts, { loader: 'ts' });
    return code;
}
