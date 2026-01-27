import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module'
      }
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin
    },
    rules: {
      // Code quality rules (formatting handled by Prettier)
      'camelcase': ['error', { 
        'properties': 'never', 
        'ignoreDestructuring': true, 
        'allow': ['^_upsert_status$', '^_[a-z_]+$', '^[a-z]+_[a-z_]+$'] 
      }],
      // Code quality rules
      'no-control-regex': 'off',
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      'no-undef': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'never',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
      }],
      'promise/always-return': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'no-prototype-builtins': 'off'
    }
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs'
    ]
  }
);
