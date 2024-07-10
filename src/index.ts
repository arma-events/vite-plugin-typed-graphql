import { normalizePath, createFilter, type Plugin } from 'vite';

import { loadDocuments } from '@graphql-tools/load';
import { resetCaches as resetGQLTagCaches, disableFragmentWarnings } from 'graphql-tag';
import { codegenTypedDocumentNode, loadSchemaDocument, typescriptToJavascript } from './utils';
import type { DocumentNode } from 'graphql';
import { DeclarationWriter } from './declarations_writer';
import { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';

const EXT = /\.(gql|graphql)$/;

disableFragmentWarnings();
export interface GraphQLPluginOptions {
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

    /**
     * Configs of GraphQL-Codegen plugins
     */
    codegenPluginConfigs?: {
        /**
         * Config to pass to the TypeScript plugin (see [documentation](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript#config-api-reference))
         *
         * Note: `strictScalars`, `defaultScalarType`, and `scalars` will be overridden by the options in this plugin.
         */
        typescript?: TypeScriptPluginConfig;

        /**
         * Config to pass to the TypeScript operations plugin (see [documentation](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations#config-api-reference))
         *
         * Note: `strictScalars`, `defaultScalarType`, and `scalars` will be overridden by the options in this plugin.
         */
        typescriptOperations?: TypeScriptDocumentsPluginConfig;
    };

    /**
     * Makes scalars strict.
     *
     * If scalars are found in the schema that are not defined in scalars an error will be thrown during codegen.
     *
     * @default false
     */
    strictScalars?: boolean;

    /**
     * Allows you to override the type that unknown scalars will have.
     *
     * @default 'unknown'
     */
    defaultScalarType?: string;

    /**
     * Extend or override the built-in scalars and custom GraphQL scalars to a custom type.
     *
     * @example
     * {
     *     UUID: 'string',
     *     DateTime: {
     *         input: 'Date | string',
     *         output: 'string'
     *     },
     * }
     */
    scalars?: {
        [name: string]:
            | string
            | {
                  input: string;
                  output: string;
              };
    };
}

export default function typedGraphQLPlugin(options: GraphQLPluginOptions = {}): Plugin {
    const filter = createFilter(options.include, options.exclude);
    const generateDeclarations = options.generateDeclarations ?? true;

    const SCHEMA_PATH = normalizePath(options?.schemaPath ?? './schema.graphql');
    let SCHEMA: DocumentNode;

    function loadSchema() {
        SCHEMA = loadSchemaDocument(SCHEMA_PATH);

        return SCHEMA;
    }

    try {
        SCHEMA = loadSchema();
    } catch (err) {
        throw new Error(
            `Failed to load GraphQL schema at "${SCHEMA_PATH}". Make sure the schema exists and is valid. The following error was thrown:\n\n${err}\n\n`,
            err instanceof Error ? err : undefined
        );
    }

    const WRITER = new DeclarationWriter(SCHEMA_PATH, SCHEMA, options);

    const TRANSFORMED_GRAPHQL_FILES = new Set<string>();

    return {
        name: 'typed-graphql',
        enforce: 'pre',
        api: { options },
        async buildStart() {
            await WRITER.writeDeclarationsForAllGQLFiles();
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

                await WRITER.writeDeclarationsForAllGQLFiles();

                server.ws.send({
                    type: 'full-reload',
                    path: '*'
                });
                return;
            }

            if (!EXT.test(path)) return;
            if (!filter(path)) return;

            if (generateDeclarations) await WRITER.writeOperationDeclarations(path);
        }
    };
}
