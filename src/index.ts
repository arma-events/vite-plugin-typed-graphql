import type { Plugin } from 'vite';
import { createFilter } from '@rollup/pluginutils';
import { resolve } from 'path';
import glob from 'fast-glob';

import { loadDocuments } from '@graphql-tools/load';
import { resetCaches as resetGQLTagCaches } from 'graphql-tag';
import { codegenTypedDocumentNode, loadSchemaDocument, typescriptToJavascript } from './utils';
import { writeOperationDeclarations, writeSchemaDeclarations } from './declarations';

const EXT = /\.(gql|graphql)$/;
const MINIMATCH_PATTERNS = ['**/*.gql', '**/*.graphql'];

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

export function graphqlTypescriptPlugin(options: GraphQLPluginOptions = {}): Plugin {
    const filter = createFilter(options.include, options.exclude);

    const SCHEMA_PATH = resolve(options?.schemaPath ?? './schema.graphql');

    let SCHEMA = loadSchemaDocument(SCHEMA_PATH);

    const TRANSFORMED_GRAPHQL_FILES = new Set<string>();

    async function writeDeclarationsForAllGQLFiles() {
        const graphQLFiles = await glob(MINIMATCH_PATTERNS);

        await Promise.all(
            graphQLFiles.map((relPath) => {
                const absPath = resolve(relPath);
                if (absPath === SCHEMA_PATH) return writeSchemaDeclarations(SCHEMA_PATH, SCHEMA);

                if (!filter(relPath)) return Promise.resolve();

                return writeOperationDeclarations(absPath, SCHEMA);
            })
        );
    }

    return {
        name: 'plugin-graphql-ts',
        async buildStart() {
            await writeDeclarationsForAllGQLFiles();
        },
        async transform(src, id) {
            if (!EXT.test(id)) return null;
            if (!filter(id)) return null;

            this.addWatchFile(SCHEMA_PATH);

            TRANSFORMED_GRAPHQL_FILES.add(id);

            resetGQLTagCaches();

            const [doc] = await loadDocuments(src, { loaders: [] });

            return {
                code: await codegenTypedDocumentNode(SCHEMA, doc, {
                    typedDocNode: true
                }).then(typescriptToJavascript),
                map: null
            };
        },

        async handleHotUpdate({ file: id, server }) {
            const absPath = resolve(id);

            if (absPath === SCHEMA_PATH) {
                // Handle changes to schema.
                //
                // Invalidate all transformed GraphQL files and reload
                // the server to make sure their transform hook run again.
                //
                // See vitejs/vite#7024 - https://github.com/vitejs/vite/issues/7024

                SCHEMA = loadSchemaDocument(SCHEMA_PATH);

                for (const id of TRANSFORMED_GRAPHQL_FILES) {
                    const mod = server.moduleGraph.getModuleById(id);
                    if (mod === undefined) continue;
                    server.moduleGraph.invalidateModule(mod);
                }

                TRANSFORMED_GRAPHQL_FILES.clear();

                await writeDeclarationsForAllGQLFiles();

                server.ws.send({
                    type: 'full-reload',
                    path: '*'
                });
                return;
            }

            if (!EXT.test(id)) return;
            if (!filter(id)) return;

            await writeOperationDeclarations(absPath, SCHEMA);
        }
    };
}
