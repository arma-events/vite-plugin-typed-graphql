import type { Plugin } from 'vite';
import { createFilter } from '@rollup/pluginutils';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import * as typedDocumentNodePlugin from '@graphql-codegen/typed-document-node';
import { transform } from 'esbuild';
import { parse, DocumentNode } from 'graphql';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { codegen } from '@graphql-codegen/core';
import { Types } from '@graphql-codegen/plugin-helpers';
import { loadDocuments } from '@graphql-tools/load';
import { resetCaches } from 'graphql-tag';

const EXT = /\.(gql|graphql)$/;

function loadSchemaDocument(path: string): DocumentNode {
    return parse(readFileSync(path, 'utf-8'));
}

async function codegenTypedDocumentNode(
    schema: DocumentNode,
    doc: Types.DocumentFile,
    includeTypes = true
): Promise<string> {
    const ts = await codegen({
        documents: [doc],
        config: {},
        // used by a plugin internally, although the 'typescript' plugin currently
        // returns the string output, rather than writing to a file
        filename: './node_modules/.vite/graphql.ts',
        schema,
        plugins: includeTypes
            ? [
                  { typescript: {} },
                  { typescriptOperations: {} },
                  { typedDocumentNode: {} }
              ]
            : [{ typedDocumentNode: {} }],
        pluginMap: {
            typescript: typescriptPlugin,
            typescriptOperations: typescriptOperationPlugin,
            typedDocumentNode: typedDocumentNodePlugin
        }
    });

    return ts;
}

async function typescriptToJavascript(ts: string): Promise<string> {
    const { code } = await transform(ts, { loader: 'ts' });
    return code;
}

interface GraphQLPluginOptions {
    /**
     * A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which
     * specifies the files in the build the plugin should operate on. By default all files are targeted.
     */
    include?: string | string[];

    /**
     * A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which
     * specifies the files in the build the plugin should _ignore_. By default no files are ignored.
     */
    exclude?: string | string[];

    /**
     * Path to GraphQL schema file
     */
    schemaPath?: string;
}

export function graphqlTypescriptPlugin(
    options: GraphQLPluginOptions = {}
): Plugin {
    const filter = createFilter(options.include, options.exclude);

    const schemaId = options?.schemaPath ?? resolve('./schema.graphql');

    let SCHEMA = loadSchemaDocument(schemaId);

    const TRANSFORMED_GRAPHQL_FILES = new Set<string>();

    return {
        name: 'plugin-graphql-ts',
        async transform(src, id) {
            if (!EXT.test(id)) return null;
            if (!filter(id)) return null;

            this.addWatchFile(schemaId);

            TRANSFORMED_GRAPHQL_FILES.add(id);

            resetCaches();

            const [doc] = await loadDocuments(src, { loaders: [] });

            writeFileSync(
                id + '.d.ts',
                await codegenTypedDocumentNode(SCHEMA, doc),
                {
                    encoding: 'utf-8'
                }
            );

            return {
                code: await codegenTypedDocumentNode(SCHEMA, doc, false).then(
                    typescriptToJavascript
                ),
                map: null
            };
        },

        async handleHotUpdate({ file: id, server }) {
            if (id !== schemaId) return;

            // Handle changes to schema.
            //
            // Invalidate all transformed GraphQL files and reload
            // the server to make sure their transform hook run again.
            //
            // See vitejs/vite#7024 - https://github.com/vitejs/vite/issues/7024

            SCHEMA = loadSchemaDocument(schemaId);

            for (const id of TRANSFORMED_GRAPHQL_FILES) {
                const mod = server.moduleGraph.getModuleById(id);
                if (mod === undefined) continue;
                server.moduleGraph.invalidateModule(mod);
            }

            TRANSFORMED_GRAPHQL_FILES.clear();

            server.ws.send({
                type: 'full-reload',
                path: '*'
            });
        }
    };
}
