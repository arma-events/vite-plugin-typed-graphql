import type { DocumentNode } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { writeFile } from 'fs/promises';
import { codegenTypedDocumentNode } from './utils';
import { readFile } from 'fs/promises';

export async function writeDeclarations(absPath: string, schema: DocumentNode) {
    const src = await readFile(absPath, 'utf-8');

    const [doc] = await loadDocuments(src, { loaders: [] });

    const typeScript = await codegenTypedDocumentNode(schema, doc, {
        operation: true,
        schema: true,
        typedDocNode: true
    });

    await writeFile(
        absPath + '.d.ts',
        '/* eslint-disable */\n\n' + typeScript,
        {
            encoding: 'utf-8'
        }
    );
}

export async function writeSchemaDeclarations(
    absPath: string,
    schema: DocumentNode
) {
    const typeScript = await codegenTypedDocumentNode(schema, undefined, {
        schema: true
    });

    await writeFile(
        absPath + '.d.ts',
        '/* eslint-disable */\n\n' + typeScript,
        {
            encoding: 'utf-8'
        }
    );
}
