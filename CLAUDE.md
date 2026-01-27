# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Lerna-managed monorepo containing NestJS utility packages. Each package in `packages/` is independently published to npm under the `@nest-toolbox/` scope.

**Packages:**
- `bunyan-logger` - BunyanLoggerService for NestJS
- `winston-logger` - WinstonLoggerService for NestJS
- `typeorm-upsert` - TypeORM upsert utilities
- `open-api-spec-to-ts` - OpenAPI spec to TypeScript generator
- `http-logger-middleware` - HTTP logging middleware
- `access-control` - Access control utilities
- `bootstrap-log` - Bootstrap logging utilities
- `progress-bar` - Progress bar utilities
- `typeorm-paginate` - TypeORM pagination helpers
- `version-generator` - Version generation utilities

## Architecture

### Monorepo Structure
- **Root-level tooling**: Jest, TypeScript, Prettier, ESLint, Lerna configuration
- **Workspace management**: npm workspaces configured via `package.json` workspaces field
- **Package independence**: Each package has its own `package.json`, `tsconfig.build.json`, and build output in `dist/`
- **Shared configuration**: Root `tsconfig.json`, `tsconfig.build.json`, `jest.config.json` extended by packages

### TypeScript Configuration
- Packages extend root `tsconfig.json` via their local `tsconfig.build.json`
- Build output goes to each package's `dist/` directory
- Source files are in `src/`, tests in `src/test/`
- Target: ES2017, CommonJS modules

### Testing
- Jest configured at root level with shared `jest.config.json`
- Test files: `*.spec.ts` or `*.test.ts` in `src/test/` directories
- Coverage enabled by default, outputs to `coverage/`
- Run tests from package directories or root using Lerna

## Common Commands

### Building
```bash
# Build all packages (cleans first)
npm run build

# Build from a specific package directory
cd packages/<package-name>
npm run build
```

### Testing
```bash
# Run tests for all packages
npm test

# Run tests for a specific package
cd packages/<package-name>
npm test

# Run a specific test file (from root)
npx jest packages/<package-name>/src/test/<test-file>.spec.ts
```

### Linting & Formatting
```bash
# Format all TypeScript and JSON files
npm run format

# Lint all packages
npm run lint

# Lint specific package
cd packages/<package-name>
npm run lint
```

### Cleanup
```bash
# Clean all build artifacts and coverage
npm run cleanup

# Remove node_modules and build artifacts
npm run reset

# Hard reset - removes all node_modules including in packages
npm run hard-reset
```

### Publishing
```bash
# Publish packages (builds automatically via prepublishOnly)
npm run publish
```

## Development Workflow

### Adding New Packages
1. Create package directory in `packages/`
2. Add `package.json` with `@nest-toolbox/<name>` scope
3. Add `tsconfig.build.json` extending `../../tsconfig.build.json`
4. Create `src/` directory for source files
5. Create `src/test/` for test files
6. Ensure package scripts match existing packages (build, clean, compile, lint, test)

### Modifying Existing Packages
1. Source files are in `packages/<package>/src/`
2. After changes, build from package directory or root
3. Run tests to verify changes
4. Each package builds independently to its own `dist/` directory

### Working with Dependencies
- Root `package.json` contains shared dev dependencies
- Package-specific dependencies go in package's own `package.json`
- Use `npm install` from root to install all dependencies (uses workspaces)

## Build System

- **Lerna**: Manages versioning and publishing across packages
- **TypeScript**: Compiles source to `dist/` using `tsc -p tsconfig.build.json`
- **Build order**: Cleanup → Compile → Output to dist/
- **Pre-publish**: Automatically builds before publishing via `prepublishOnly` hook

## Testing Architecture

- **Framework**: Jest with ts-jest transformer
- **Configuration**: Shared root `jest.config.json`
- **Coverage**: Collected from `**/src/**`, excludes `**/src/test/**`
- **Reporters**: Default + jest-junit for CI/CD
- **Test pattern**: `(/tests/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$`

## Node & npm Requirements

- **Node**: >=18 <=22 (Volta pinned to 22.16.0)
- **npm**: <=11
- **Volta**: Used for Node version management
