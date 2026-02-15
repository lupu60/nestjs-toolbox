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
├── jest.config.json             # Shared Jest config
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
- **Formatting:** Prettier (runs via `npm run format`)
- **Linting:** ESLint with NestJS config
- **Naming:** camelCase for functions/variables, PascalCase for classes/types
- **Files:** kebab-case for filenames

### Testing
- Test files: `src/test/*.spec.ts`
- Framework: Jest with ts-jest
- **Every package must have tests**
- Run single test: `npx jest packages/<pkg>/src/test/<file>.spec.ts`

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
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "npm run clean && npm run compile",
       "clean": "rimraf dist",
       "compile": "tsc -p tsconfig.build.json",
       "lint": "eslint src --ext .ts",
       "test": "jest"
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
| `npm run lint` | Lint all packages |
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

- **Node:** >=18 <=22 (Volta pinned to 22.16.0)
- **npm:** <=11
