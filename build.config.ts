import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    entries: ['src/index'],
    clean: true,
    externals: ['graphql-tag'],
    declaration: true,
    rollup: {
        emitCJS: true
    }
});
