#!/usr/bin/env node

import { Command } from 'commander';
import { createFilter, normalizePath } from 'vite';
import { DeclarationWriter } from './declarations_writer';
import { loadSchemaDocument } from './utils';
import { disableFragmentWarnings } from 'graphql-tag';

const program = new Command();

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

const options = {
    schema: program.getOptionValue('schema') as string,
    include: program.getOptionValue('include') as string[] | undefined,
    exclude: program.getOptionValue('exclude') as string[] | undefined
};

if (options.include?.length === 0) options.include = undefined;
if (options.exclude?.length === 0) options.exclude = undefined;

const SCHEMA_PATH = normalizePath(options.schema);

const SCHEMA = loadSchemaDocument(SCHEMA_PATH);

const filter = createFilter(options.include, options.exclude);

disableFragmentWarnings();

const WRITER = new DeclarationWriter(SCHEMA_PATH, SCHEMA, filter);

(async () => {
    await WRITER.writeDeclarationsForAllGQLFiles();
})();
