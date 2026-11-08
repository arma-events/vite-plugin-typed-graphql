import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index', 'src/build-gql-declarations'],
    format: 'esm',
    dts: true,
    clean: true,
    fixedExtension: true,
    deps: { neverBundle: ['graphql-tag'] }
});
