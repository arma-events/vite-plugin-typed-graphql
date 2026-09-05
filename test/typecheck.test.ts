import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { normalizePath } from 'vite';
import { DeclarationWriter } from '../src/declarations_writer';
import { loadSchemaDocument } from '../src/utils';
import { copyFixture, withCwd } from './helpers';

let dir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
    ({ dir, cleanup } = await copyFixture('basic'));

    const schemaPath = normalizePath(join(dir, 'schema.graphql'));
    const writer = new DeclarationWriter(schemaPath, loadSchemaDocument(schemaPath));
    await withCwd(dir, () => writer.writeDeclarationsForAllGQLFiles());
});

afterEach(() => cleanup());

/** Type-check `typecheck.ts` in the fixture copy and return formatted diagnostics. */
function typecheck(skipLibCheck: boolean): string[] {
    const program = ts.createProgram([join(dir, 'typecheck.ts')], {
        strict: true,
        noEmit: true,
        skipLibCheck,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        types: []
    });

    return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        if (!diagnostic.file || diagnostic.start === undefined) return message;

        const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        return `${relative(dir, diagnostic.file.fileName)}:${line + 1} ${message}`;
    });
}

describe('generated declarations', () => {
    it('type-check against a consumer with precise types', () => {
        expect(typecheck(true)).toEqual([]);
    });

    it('are valid declaration files on their own (skipLibCheck: false)', () => {
        expect(typecheck(false)).toEqual([]);
    });
});
