# Vite Plugin Typed GraphQL [![npm](https://img.shields.io/npm/v/vite-plugin-typed-graphql.svg)](https://npmjs.com/package/vite-plugin-typed-graphql)

_Vite Plugin which enables the import of [Typed-Document-Nodes](https://the-guild.dev/blog/typed-document-node) directly from `.gql` / `.graphql` files, to allow for type-safe GraphQL implementations._

## How it works

Fundamentally, this plugin allows you to import GraphQL `DocumentNode`s from `.gql` / `.graphql` files, but it has a few more tricks up its sleeve.

Supplied with a GraphQL schema, it can automatically generate type declarations (`.d.ts`) files alongside all included GraphQL files, to allow type-safe Queries and Mutations.

## Installation
Install the package:
```
npm i --save vite-plugin-typed-graphql --save-dev
```

## Setup
1. Add the plugin to the Vite config:
   ```ts
   // vite.config.ts

   import { defineConfig } from 'vite';
   import typedGraphQL from 'vite-plugin-typed-graphql';

   export default defineConfig({
     plugins: [
       typedGraphQL(/* See below for list of options */) 
     ],
   });
   ```
2. Create a `schema.graphql` file containing your GraphQL schema in the root directory of your project (the path can be adjusted via the options)

3. Although it is not necessary, we also recommend adding the following lines to your `.gitignore`:
   ```
   *.gql.d.ts
   *.graphql.d.ts
   ```

## Options

### `include`
Type: `String` | `Array[...String]`  
Default: `null`

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should ignore. By default no files are ignored.

### `exclude`
Type: `String` | `Array[...String]`  
Default: `null`

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.

### `schemaPath`
Type: `String`  
Default: `./schema.graphql`

Path to your schema file.


### `generateDeclarations`
Type: `Boolean`  
Default: `true`

If `true`, instructs plugin to generate type declaration files next to included `.graphql` / `.gql` files, to allow for type-safe GraphQL queries / mutations.