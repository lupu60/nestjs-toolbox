import { fileURLToPath } from 'node:url';
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
      // src/index.ts files are re-export barrels, plus version-generator's CLI, which scripts/smoke-pack.mjs runs through its real bin
      exclude: ['**/src/test/**', '**/src/**/*.spec.ts', '**/src/**/*.test.ts', '**/src/index.ts'],
      // Enforced per package, since each package runs this config on its own sources
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 85,
        lines: 85,
      },
    },

    // Environment
    environment: 'node',

    // Globals (enables describe, it, expect without imports)
    globals: true,

    // Holds back direct stdout/stderr writes of passing tests (absolute path: packages run this config from their own directory)
    setupFiles: [fileURLToPath(new URL('./test/setup.ts', import.meta.url))],

    // Print console output only for failing tests, so failures are not buried in logger noise
    silent: 'passed-only',

    // Test timeout
    testTimeout: 10000,

    // Pass when no tests are found
    passWithNoTests: true,

    // Server configuration for better CommonJS handling
    server: {
      deps: {
        inline: ['bunyan-format', 'colors'],
      },
    },
  },
});
