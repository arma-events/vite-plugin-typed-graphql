import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
    {
        files: ['**/*.{js,ts}']
    },
    {
        ignores: ['test/.tmp/**', 'test/snapshots/**']
    },
    js.configs.recommended,
    tseslint.configs.recommended,
    prettierRecommended,
    {
        rules: {
            'no-console': 'warn'
        }
    }
]);
