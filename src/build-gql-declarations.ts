#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'node:path';
import { normalizePath, loadConfigFromFile, type PluginOption, type Plugin } from 'vite';
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

    const args = {
        schema: program.getOptionValue('schema') as string | undefined,
        include: program.getOptionValue('include') as string[] | undefined,
        exclude: program.getOptionValue('exclude') as string[] | undefined
    };

    if (args.include?.length === 0) args.include = undefined;
    if (args.exclude?.length === 0) args.exclude = undefined;

    const options: GraphQLPluginOptions = {
        ...(viteOptions ?? {}),
        schemaPath: args.schema ?? viteOptions?.schemaPath,
        include: args.include ?? viteOptions?.include,
        exclude: args.exclude ?? viteOptions?.exclude
    };

    const SCHEMA_PATH = normalizePath(resolve(options.schemaPath ?? './schema.graphql'));

    const SCHEMA = loadSchemaDocument(SCHEMA_PATH);

    disableFragmentWarnings();

    const WRITER = new DeclarationWriter(SCHEMA_PATH, SCHEMA, options);

    await WRITER.writeDeclarationsForAllGQLFiles();

    await new Promise((resolve) => setTimeout(resolve, 500));

    // eslint-disable-next-line no-console
    console.log('✅ Wrote all GraphQL declarations');
})();
