import { writeSchemaDeclarations, writeOperationDeclarations } from './declarations';
import { Project } from 'ts-morph';
import glob from 'fast-glob';
import { dirname, relative } from 'path';
import { normalizePath } from 'vite';
import { DocumentNode } from 'graphql';
import { sep } from 'node:path';
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';

const MINIMATCH_PATTERNS = ['**/*.gql', '**/*.graphql'];

export class DeclarationWriter {
    private schema: DocumentNode;
    private schemaPath: string;
    private codegenTSPluginConfig?: TypeScriptPluginConfig;
    private codegenTSOperationsPluginConfig?: TypeScriptDocumentsPluginConfig;
    private schemaExports: string[] = [];
    private filter?: (path: string) => boolean = undefined;

    constructor(
        schemaPath: string,
        schema: DocumentNode,
        filter?: (path: string) => boolean,
        codegenTSPluginConfig?: TypeScriptPluginConfig,
        codegenTSOperationsPluginConfig?: TypeScriptDocumentsPluginConfig
    ) {
        this.schemaPath = schemaPath;
        this.schema = schema;
        this.codegenTSPluginConfig = codegenTSPluginConfig;
        this.codegenTSOperationsPluginConfig = codegenTSOperationsPluginConfig;
        this.filter = filter;
    }

    public async writeOperationDeclarations(path: string) {
        const schemaPath = relative(dirname(path), this.schemaPath).split(sep).join('/');

        await writeOperationDeclarations(
            path,
            this.schema,
            this.codegenTSOperationsPluginConfig,
            `import {\n  ${this.schemaExports.join(',\n  ')}\n} from '${schemaPath}';\n`
        );
    }

    public async writeSchemaDeclarations() {
        const tsDefinitions = await writeSchemaDeclarations(this.schemaPath, this.schema, this.codegenTSPluginConfig);

        const project = new Project({ useInMemoryFileSystem: true });
        const mySchemaFile = project.createSourceFile('schema.ts', tsDefinitions);

        this.schemaExports = Array.from(mySchemaFile.getExportedDeclarations().keys());
    }

    public async writeDeclarationsForAllGQLFiles() {
        await this.writeSchemaDeclarations();

        const graphQLFiles = await glob(MINIMATCH_PATTERNS);

        await Promise.all(
            graphQLFiles.map((path) => {
                path = normalizePath(path);

                if (path === this.schemaPath) return Promise.resolve();

                if (!(this.filter?.(path) ?? true)) return Promise.resolve();

                return this.writeOperationDeclarations(path);
            })
        );
    }
}
