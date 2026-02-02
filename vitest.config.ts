import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['lcov', 'json', 'text'],
      include: ['**/src/**'],
      exclude: ['**/src/test/**', '**/src/**/*.spec.ts', '**/src/**/*.test.ts'],
    },

    // Environment
    environment: 'node',

    // Globals (enables describe, it, expect without imports)
    globals: true,

    // Test timeout
    testTimeout: 10000,

    // Watch mode exclude patterns
    watchExclude: ['**/node_modules/**', '**/dist/**'],

    // Server configuration for better CommonJS handling
    server: {
      deps: {
        inline: ['bunyan-format', 'colors'],
      },
    },
  },
});
