# Vite Plugin Typed GraphQL [![npm](https://img.shields.io/npm/v/vite-plugin-typed-graphql.svg)](https://npmjs.com/package/vite-plugin-typed-graphql)

_Vite Plugin which enables the import of [Typed-Document-Nodes](https://the-guild.dev/blog/typed-document-node) directly from `.gql` / `.graphql` files, to allow for type-safe GraphQL implementations._

## How it works

Fundamentally, this plugin allows you to import GraphQL `DocumentNode`s from `.gql` / `.graphql` files, but it has a few more tricks up its sleeve.

Supplied with a GraphQL schema, it can automatically generate type declarations (`.d.ts`) files alongside all included GraphQL files, to allow type-safe Queries and Mutations.

## Usage

<details>
  <summary>schema.graphql</summary>

  ```graphql
  
  # [...]

  type User {
      """
      The username used to login.
      """
      login: String!
    
      # [...]
  }

  type Query {
      # [...]

      """
      Lookup a user by login.
      """
      user(login: String!): User

      """
      The currently authenticated user.
      """
      viewer: User!
  }
  ```
</details>

<details>
  <summary>queries.graphql</summary>

  ```graphql
  query User($username: String!) {
      user(login: $username) {
          login
      }
  }

  query Viewer {
      viewer {
          login
      }
  }
  ```
</details>

```ts
import { request } from 'graphql-request';
import { User, Viewer } from './queries.graphql';

const ENDPOINT = 'https://api.github.com/graphql';

// @ts-expect-error | This will error, because username has to be of type string
request(ENDPOINT, User, { username: 3 });

const { viewer } = await request(ENDPOINT, Viewer);

// @ts-expect-error | This will error, because unknown_field does not exist on user
console.log(viewer.unknown_field);

console.log(viewer.login);
```

## Installation

Install the package:

```
npm i --save-dev vite-plugin-typed-graphql
```

## Setup

1. Add the plugin to the Vite config:

    ```ts
    // vite.config.ts

    import { defineConfig } from 'vite';
    import typedGraphQL from 'vite-plugin-typed-graphql';

    export default defineConfig({
        plugins: [typedGraphQL(/* See below for list of options */)]
    });
    ```

2. Create a `schema.graphql` file containing your GraphQL schema in the root directory of your project (the path can be adjusted via the options)

3. Although it is not necessary, we also recommend adding the following lines to your `.gitignore`:
    ```
    *.gql.d.ts
    *.graphql.d.ts
    ```

## Options

### `exclude`

Type: `String` | `Array[...String]`  
Default: `null`

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies the files in the build the plugin should ignore. By default no files are ignored.

### `include`

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
