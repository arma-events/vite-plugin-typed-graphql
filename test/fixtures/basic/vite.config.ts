import { defineConfig } from 'vite';
import typedGraphQL from '../../../src/index';

// Fixture copies live in `test/.tmp/<name>/`, at the same depth as this file,
// so the relative import above resolves from both locations.
export default defineConfig({
    plugins: [typedGraphQL({ schemaPath: './schema.graphql', exclude: ['**/ignored/**'] })]
});
