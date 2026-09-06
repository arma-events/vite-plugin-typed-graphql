import { writeSchemaDeclarations, writeOperationDeclarations } from './declarations';
import glob from 'fast-glob';
import { dirname, relative, resolve, sep } from 'path';
import { createFilter, normalizePath } from 'vite';
import { DocumentNode } from 'graphql';
import type { GraphQLPluginOptions } from '.';

const MINIMATCH_PATTERNS = ['**/*.gql', '**/*.graphql'];

export class DeclarationWriter {
    public schema: DocumentNode;
    private schemaPath: string;
    private options: GraphQLPluginOptions;
    private filter?: (path: string) => boolean = undefined;

    constructor(schemaPath: string, schema: DocumentNode, options: GraphQLPluginOptions = {}) {
        this.schemaPath = schemaPath;
        this.schema = schema;
        this.options = options;
        this.filter = createFilter(options.include, options.exclude);
    }

    public async writeOperationDeclarations(path: string) {
        let schemaPath = relative(dirname(path), this.schemaPath).split(sep).join('/');

        // `relative` yields a bare specifier for siblings (e.g. `schema.graphql`), which
        // TypeScript would resolve as a package import
        if (!schemaPath.startsWith('.')) schemaPath = `./${schemaPath}`;

        await writeOperationDeclarations(path, this.schema, this.options, schemaPath);
    }

    public async writeSchemaDeclarations() {
        await writeSchemaDeclarations(this.schemaPath, this.schema, this.options);
    }

    public async writeDeclarationsForAllGQLFiles() {
        await this.writeSchemaDeclarations();

        const graphQLFiles = await glob(MINIMATCH_PATTERNS);

        await Promise.all(
            graphQLFiles.map((path) => {
                path = normalizePath(resolve(path));

                if (path === this.schemaPath) return Promise.resolve();

                if (!(this.filter?.(path) ?? true)) return Promise.resolve();

                return this.writeOperationDeclarations(path);
            })
        );
    }
}
