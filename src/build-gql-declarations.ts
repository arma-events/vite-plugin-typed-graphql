#!/usr/bin/env node

import { Command } from 'commander';
import { createFilter, normalizePath, loadConfigFromFile, type PluginOption, type Plugin } from 'vite';
import { DeclarationWriter } from './declarations_writer';
import { loadSchemaDocument } from './utils';
import { disableFragmentWarnings } from 'graphql-tag';
import type { GraphQLPluginOptions } from '.';

const program = new Command();

(async function () {
    program
        .option('-s, --schema <path>', 'Path to GraphQL Schema', './schema.graphql')
        .option(
            '-e, --exclude <pattern...>',
            'A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should ignore. By default no files are ignored.'
        )
        .option(
            '-i, --include <pattern...>',
            'A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.'
        );

    program.parse();

    async function findPluginRecursive(
        options: PluginOption[],
        name: string
    ): Promise<Plugin<{ options: GraphQLPluginOptions }> | null> {
        const awaited = await Promise.all(options);

        for (const plugin of awaited) {
            if (plugin === false) continue;
            if (plugin === null) continue;
            if (plugin === undefined) continue;

            if (Array.isArray(plugin)) {
                const found = await findPluginRecursive(plugin, name);
                if (found) return found;
                continue;
            }

            if (plugin.name === name) {
                return plugin;
            }
        }

        return null;
    }

    const viteOptions = await loadConfigFromFile({ command: 'build', mode: 'production' }).then(async (res) => {
        if (!res) return null;
        const {
            config: { plugins }
        } = res;

        if (!plugins) return null;

        const plugin = await findPluginRecursive(plugins, 'typed-graphql');

        return plugin?.api?.options ?? null;
    });

    const options = {
        schema: program.getOptionValue('schema') as string,
        include: program.getOptionValue('include') as string[] | undefined,
        exclude: program.getOptionValue('exclude') as string[] | undefined
    };

    if (options.include?.length === 0) options.include = undefined;
    if (options.exclude?.length === 0) options.exclude = undefined;

    const SCHEMA_PATH = normalizePath(options.schema ?? viteOptions?.schemaPath);

    const SCHEMA = loadSchemaDocument(SCHEMA_PATH);

    const filter = createFilter(options.include ?? viteOptions?.include, options.exclude ?? viteOptions?.exclude);

    disableFragmentWarnings();

    const WRITER = new DeclarationWriter(SCHEMA_PATH, SCHEMA, filter, viteOptions?.codegenTSPluginConfig);

    await WRITER.writeDeclarationsForAllGQLFiles();

    await new Promise((resolve) => setTimeout(resolve, 500));

    // eslint-disable-next-line no-console
    console.log('✅ Wrote all GraphQL declarations');
})();
