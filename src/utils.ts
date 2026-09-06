import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import * as typedDocumentNodePlugin from '@graphql-codegen/typed-document-node';
import { transform } from 'esbuild';
import { parse, DocumentNode, Kind } from 'graphql';
import { readFileSync } from 'fs';
import { codegen } from '@graphql-codegen/core';
import { Types } from '@graphql-codegen/plugin-helpers';
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';
import type { GraphQLPluginOptions } from '.';

export function loadSchemaDocument(path: string): DocumentNode {
    return parse(readFileSync(path, 'utf-8'));
}

function makeTsPluginConfig(options: GraphQLPluginOptions): TypeScriptPluginConfig {
    const config = options.codegenPluginConfigs?.typescript;

    return {
        ...config,
        defaultScalarType: options.defaultScalarType ?? config?.defaultScalarType ?? 'unknown',
        strictScalars: options.strictScalars ?? config?.strictScalars ?? false,
        scalars: options.scalars ?? config?.scalars ?? {}
    };
}

/**
 * Map every enum of the schema to the schema declarations file, so operation declarations
 * import the enums from there instead of redeclaring them.
 */
function schemaEnumValues(schema: DocumentNode, schemaImportPath: string): Record<string, string> {
    const enumNames = schema.definitions
        .filter((def) => def.kind === Kind.ENUM_TYPE_DEFINITION || def.kind === Kind.ENUM_TYPE_EXTENSION)
        .map((def) => def.name.value);

    return Object.fromEntries(enumNames.map((name) => [name, `${schemaImportPath}#${name}`]));
}

function makeTsOperationsPluginConfig(
    options: GraphQLPluginOptions,
    schema: DocumentNode,
    schemaImportPath?: string
): TypeScriptDocumentsPluginConfig {
    const config = options.codegenPluginConfigs?.typescriptOperations;

    return {
        ...config,
        enumValues: config?.enumValues ?? (schemaImportPath ? schemaEnumValues(schema, schemaImportPath) : undefined),
        defaultScalarType: options.defaultScalarType ?? config?.defaultScalarType ?? 'unknown',
        strictScalars: options.strictScalars ?? config?.strictScalars ?? false,
        scalars: options.scalars ?? config?.scalars ?? {}
    };
}

export async function codegenTypedDocumentNode(
    schema: DocumentNode,
    doc?: Types.DocumentFile,
    plugins: {
        schema?: boolean;
        operation?: boolean;
        typedDocNode?: boolean;
    } = { schema: true, operation: true, typedDocNode: true },
    options: GraphQLPluginOptions = {},
    schemaImportPath?: string
): Promise<string> {
    const configuredPlugins: Types.ConfiguredPlugin[] = [];

    if (plugins.schema) configuredPlugins.push({ typescript: makeTsPluginConfig(options) });
    if (plugins.operation)
        configuredPlugins.push({
            typescriptOperations: makeTsOperationsPluginConfig(options, schema, schemaImportPath)
        });
    if (plugins.typedDocNode) configuredPlugins.push({ typedDocumentNode: {} });

    const ts = await codegen({
        documents: doc ? [doc] : [],
        config: {
            documentVariableSuffix: '',
            fragmentVariableSuffix: ''
        },
        // used by a plugin internally, although the 'typescript' plugin currently
        // returns the string output, rather than writing to a file
        filename: './node_modules/.vite/graphql.ts',
        schema,
        plugins: configuredPlugins,
        pluginMap: {
            typescript: typescriptPlugin,
            typescriptOperations: typescriptOperationPlugin,
            typedDocumentNode: typedDocumentNodePlugin
        }
    });

    return ts;
}

export async function typescriptToJavascript(ts: string): Promise<string> {
    const { code } = await transform(ts, { loader: 'ts' });
    return code;
}
