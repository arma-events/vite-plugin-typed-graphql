import { writeSchemaDeclarations, writeOperationDeclarations } from './declarations';
import { Project } from 'ts-morph';
import glob from 'fast-glob';
import { dirname, relative } from 'path';
import { normalizePath } from 'vite';
import { DocumentNode } from 'graphql';
import { sep } from 'node:path';

const MINIMATCH_PATTERNS = ['**/*.gql', '**/*.graphql'];

export class DeclarationWriter {
    private schema: DocumentNode;
    private schemaPath: string;
    private schemaExports: string[] = [];
    private filter?: (path: string) => boolean = undefined;

    constructor(schemaPath: string, schema: DocumentNode, filter?: (path: string) => boolean) {
        this.schemaPath = schemaPath;
        this.schema = schema;
        this.filter = filter;
    }

    public async writeOperationDeclarations(path: string) {
        await writeOperationDeclarations(
            path,
            this.schema,
            `import {\n  ${this.schemaExports.join(',\n  ')}\n} from '${relative(dirname(path), this.schemaPath).split(sep).join('/')}';\n`
        );
    }

    public async writeSchemaDeclarations() {
        const tsDefinitions = await writeSchemaDeclarations(this.schemaPath, this.schema);

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
