import { writeSchemaDeclarations, writeOperationDeclarations } from './declarations';
import { Project } from 'ts-morph';
import glob from 'fast-glob';
import { dirname, relative, resolve } from 'path';
import { createFilter, normalizePath } from 'vite';
import { DocumentNode } from 'graphql';
import { sep } from 'node:path';
import type { GraphQLPluginOptions } from '.';

const MINIMATCH_PATTERNS = ['**/*.gql', '**/*.graphql'];

export class DeclarationWriter {
    public schema: DocumentNode;
    private schemaPath: string;
    private options: GraphQLPluginOptions;
    private schemaExports: string[] = [];
    private filter?: (path: string) => boolean = undefined;

    constructor(schemaPath: string, schema: DocumentNode, options: GraphQLPluginOptions = {}) {
        this.schemaPath = schemaPath;
        this.schema = schema;
        this.options = options;
        this.filter = createFilter(options.include, options.exclude);
    }

    public async writeOperationDeclarations(path: string) {
        const schemaPath = relative(dirname(path), this.schemaPath).split(sep).join('/');

        await writeOperationDeclarations(
            path,
            this.schema,
            this.options,
            `import {\n  ${this.schemaExports.join(',\n  ')}\n} from '${schemaPath}';\n`
        );
    }

    public async writeSchemaDeclarations() {
        const tsDefinitions = await writeSchemaDeclarations(this.schemaPath, this.schema, this.options);

        const project = new Project({ useInMemoryFileSystem: true });
        const mySchemaFile = project.createSourceFile('schema.ts', tsDefinitions);

        this.schemaExports = Array.from(mySchemaFile.getExportedDeclarations().keys());
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
