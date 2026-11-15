# AGENTS.md

Guidance for AI agents working with this repository.

## Overview

**nestjs-toolbox** is a Lerna monorepo of production-ready NestJS utility packages published under `@nest-toolbox/*` scope.

**Philosophy:** Decorator-first, zero-config defaults, minimal dependencies.

## Packages

| Package | Description |
|---------|-------------|
| `access-control` | Role-based access control decorators |
| `bootstrap-log` | Startup logging utilities |
| `bunyan-logger` | BunyanLoggerService for NestJS |
| `http-logger-middleware` | HTTP request/response logging |
| `open-api-spec-to-ts` | OpenAPI spec → TypeScript generator |
| `progress-bar` | CLI progress bar utilities |
| `request-context` | AsyncLocalStorage-based request context |
| `response-envelope` | Standardized API response wrappers |
| `typeorm-audit-log` | Audit logging for TypeORM entities |
| `typeorm-paginate` | Cursor & offset pagination helpers |
| `typeorm-soft-delete` | Soft delete support for TypeORM |
| `typeorm-upsert` | TypeORM upsert utilities |
| `version-generator` | Build version generation |
| `winston-logger` | WinstonLoggerService for NestJS |

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm test

# Lint & format
npm run lint
npm run format
```

## Project Structure

```
nestjs-toolbox/
├── packages/
│   └── <package-name>/
│       ├── src/
│       │   ├── index.ts         # Public exports
│       │   └── test/            # Tests (*.spec.ts)
│       ├── dist/                # Build output (git-ignored)
│       ├── package.json
│       └── tsconfig.build.json
├── package.json                 # Root workspace config
├── tsconfig.json                # Shared TS config
├── vitest.config.ts             # Shared Vitest config
├── biome.json                   # Biome lint + format config
├── test/                        # Shared integration test helpers
└── lerna.json                   # Lerna config
```

## Coding Conventions

### TypeScript
- **Target:** ES2017, CommonJS modules
- **Strict mode:** Enabled
- **Decorators:** Use NestJS decorator patterns
- Prefer `type` over `interface` when possible
- Export everything from `src/index.ts`

### Style
- **Formatting:** Biome (runs via `npm run format`)
- **Linting:** Biome (`npm run lint` per package, `npm run check` for the whole repo)
- **Naming:** camelCase for functions/variables, PascalCase for classes/types
- **Files:** kebab-case for filenames

### Testing
- Test files: `src/test/*.spec.ts`
- Integration tests (need PostgreSQL): `src/test/*.integration.spec.ts`, run via `npm run test:e2e`
- HTTP-level tests: `src/test/*http.spec.ts` boot a real Nest app and call it with `supertest`
- Framework: Vitest (globals enabled, shared `vitest.config.ts`)
- Coverage thresholds are enforced per package (see `vitest.config.ts`)
- Test files are type-checked separately: `npm run typecheck:test`
- Injected constructor parameters need an explicit `@Inject(...)` token: Vitest emits no decorator type metadata, and a type-only import breaks it in the compiled output too
- **Every package must have tests**
- Run single test: `npx vitest run --coverage.enabled=false packages/<pkg>/src/test/<file>.spec.ts`

### Dependencies
- Minimize external dependencies
- NestJS peer dependencies go in `peerDependencies`
- Dev-only tools go in root `devDependencies`
- Production deps go in package's own `dependencies`

## Adding a New Package

1. Create directory: `packages/<package-name>/`
2. Add `package.json`:
   ```json
   {
     "name": "@nest-toolbox/<package-name>",
     "version": "0.0.1",
     "main": "dist/index",
     "types": "dist/index",
     "files": ["dist"],
     "publishConfig": {
       "registry": "https://registry.npmjs.org/",
       "access": "public"
     },
     "scripts": {
       "build": "npm run clean && npm run compile",
       "clean": "rimraf -rf ./dist",
       "cleanup": "rimraf -rf dist coverage",
       "compile": "tsc -p tsconfig.build.json",
       "lint": "biome check src",
       "test": "vitest run --config ../../vitest.config.ts",
       "prepublishOnly": "npm run build"
     }
   }
   ```
3. Add `tsconfig.build.json` extending `../../tsconfig.build.json`
4. Create `src/index.ts` with public exports
5. Create `src/test/` with at least one test
6. Run `npm install` from root
7. Build & test before committing

## PR Workflow

1. Create feature branch: `git checkout -b feat/<name>` or `fix/<name>`
2. Make changes, add tests
3. Run `npm run lint && npm test`
4. Commit with conventional message: `feat(package): description`
5. Push and open PR against `master`
6. Wait for CI to pass (all workflows green)
7. Squash merge when approved

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run test:e2e` | Run PostgreSQL integration tests |
| `npm run test:smoke` | Pack every package, install the tarballs in a temp project, boot a Nest app (needs `npm run build` first) |
| `npm run typecheck:test` | Type-check spec files |
| `npm run lint` | Lint all packages |
| `npm run check` | Biome lint + format check for the whole repo |
| `npm run format` | Format all files |
| `npm run cleanup` | Remove dist/ and coverage/ |
| `npm run reset` | Remove node_modules + build artifacts |
| `npm run hard-reset` | Full reset including package node_modules |

## What NOT to Do

- ❌ Don't commit directly to `master` — always use PRs
- ❌ Don't skip tests — every package needs coverage
- ❌ Don't add heavy dependencies — keep packages lightweight
- ❌ Don't break existing APIs without major version bump
- ❌ Don't leave `console.log` in production code

## CI/CD

- **GitHub Actions** runs on every PR
- Workflows: Lint, Type Check, Node CI, CodeQL
- All checks must pass before merge
- Packages auto-publish on version bump (via Lerna)

## Node Requirements

- **Node:** >=20.19 (CI tests 22.x, 24.x, 26.x; Volta pinned to 24.11.0)
- **npm:** <=11
