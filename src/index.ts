import { normalizePath, Plugin } from 'vite';
import { createFilter } from '@rollup/pluginutils';
import glob from 'fast-glob';

import { loadDocuments } from '@graphql-tools/load';
import { resetCaches as resetGQLTagCaches } from 'graphql-tag';
import { codegenTypedDocumentNode, loadSchemaDocument, typescriptToJavascript } from './utils';
import { writeOperationDeclarations, writeSchemaDeclarations } from './declarations';
import type { DocumentNode } from 'graphql';
import { relative, dirname } from 'path';
import { Project } from 'ts-morph';

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

    /**
     * If `true`, instructs plugin to generate type declaration files next to included `.graphql`
     * / `.gql` files, to allow for type-safe GraphQL queries / mutations.
     */
    generateDeclarations?: boolean;
}

export default function typedGraphQLPlugin(options: GraphQLPluginOptions = {}): Plugin {
    const filter = createFilter(options.include, options.exclude);
    const generateDeclarations = options.generateDeclarations ?? true;

    const SCHEMA_PATH = normalizePath(options?.schemaPath ?? './schema.graphql');

    let SCHEMA_EXPORTS: string[] = [];
    let SCHEMA: DocumentNode;

    function loadSchema() {
        SCHEMA = loadSchemaDocument(SCHEMA_PATH);
        SCHEMA_EXPORTS = [];
    }

    try {
        loadSchema();
    } catch (err) {
        throw new Error(
            `Failed to load GraphQL schema at "${SCHEMA_PATH}". Make sure the schema exists and is valid. The following error was thrown:\n\n${err}\n\n`,
            err
        );
    }

    const TRANSFORMED_GRAPHQL_FILES = new Set<string>();

    async function writeDeclarationForFile(path: string) {
        await writeOperationDeclarations(
            path,
            SCHEMA,
            `import {\n  ${SCHEMA_EXPORTS.join(',\n  ')}\n} from '${relative(dirname(path), SCHEMA_PATH)}';\n`
        );
    }

    async function writeDeclarationsForAllGQLFiles() {
        if (!generateDeclarations) return;

        {
            const tsDefinitions = await writeSchemaDeclarations(SCHEMA_PATH, SCHEMA);

            const project = new Project({ useInMemoryFileSystem: true });
            const mySchemaFile = project.createSourceFile('schema.ts', tsDefinitions);

            SCHEMA_EXPORTS = Array.from(mySchemaFile.getExportedDeclarations().keys());
        }

        const graphQLFiles = await glob(MINIMATCH_PATTERNS);

        await Promise.all(
            graphQLFiles.map((path) => {
                path = normalizePath(path);

                if (path === SCHEMA_PATH) return Promise.resolve();

                if (!filter(path)) return Promise.resolve();

                return writeDeclarationForFile(path);
            })
        );
    }

    return {
        name: 'typed-graphql',
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

        async handleHotUpdate({ file: path, server }) {
            path = normalizePath(path);

            if (path === SCHEMA_PATH) {
                // Handle changes to schema.
                //
                // Invalidate all transformed GraphQL files and reload
                // the server to make sure their transform hook run again.
                //
                // See vitejs/vite#7024 - https://github.com/vitejs/vite/issues/7024

                loadSchema();

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

            if (!EXT.test(path)) return;
            if (!filter(path)) return;

            if (generateDeclarations) await writeDeclarationForFile(path);
        }
    };
}
