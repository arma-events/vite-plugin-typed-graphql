import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    entries: ['src/index', 'src/build-gql-declarations'],
    clean: true,
    externals: ['graphql-tag'],
    declaration: true,
    rollup: {
        emitCJS: true
    }
});
