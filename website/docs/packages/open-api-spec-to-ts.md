---
sidebar_label: "open-api-spec-to-ts"
---

# @nest-toolbox/open-api-spec-to-ts

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fopen-api-spec-to-ts.svg)](https://www.npmjs.com/package/@nest-toolbox/open-api-spec-to-ts)

Generate TypeScript interfaces and enums from your OpenAPI (Swagger) specifications. Powered by [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript).

## Installation

```bash
npm install @nest-toolbox/open-api-spec-to-ts
```

## Quick Start

```typescript
import { generate } from '@nest-toolbox/open-api-spec-to-ts';

// Generate TypeScript interfaces from an OpenAPI spec
await generate('./openapi.json', './src/interfaces');
```

Given an `openapi.json` with component schemas, this creates:
- One `.ts` file per schema (e.g., `User.ts`, `Article.ts`)
- An `index.ts` barrel file that re-exports everything
- Auto-generated import statements between related interfaces

## Features

- 📄 **One file per schema** — each OpenAPI component schema gets its own TypeScript file
- 🔗 **Automatic imports** — cross-references between schemas are resolved into proper import statements
- 📦 **Barrel file** — generates an `index.ts` that re-exports all interfaces
- 🏷️ **Enum support** — string enums are converted to TypeScript enums with UPPER_SNAKE_CASE names
- 🔄 **Self-reference handling** — schemas that reference themselves are handled correctly
- 🧹 **Clean output** — removes existing files before regenerating
- 📊 **Configurable verbosity** — control logging output with `LogLevel`
- 🎨 **Customizable formatting** — pass `json-schema-to-typescript` options for code style control

## API Reference

### `generate(openApiFilePath, interfacesDirPath, options?)`

The main function that reads an OpenAPI spec and generates TypeScript files.

```typescript
import { generate, LogLevel } from '@nest-toolbox/open-api-spec-to-ts';

await generate(
  './openapi.json',    // path to your OpenAPI spec
  './src/interfaces',  // output directory for generated files
  {
    verbosity: LogLevel.INFO,
    style: {
      singleQuote: true,
      semi: true,
      tabWidth: 2,
    },
  },
);
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `openApiFilePath` | `string` | `'./openapi.json'` | Path to the OpenAPI JSON specification file |
| `interfacesDirPath` | `string` | `'./interfaces'` | Output directory for generated TypeScript files |
| `options` | `Partial<Options>` | `{}` | Generation options (see below) |

#### Options

Extends `json-schema-to-typescript`'s `Options` with additional fields:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `verbosity` | `LogLevel` | `LogLevel.NONE` | Logging level (`NONE`, `ERROR`, `INFO`) |
| `bannerComment` | `string` | `''` | Comment added to the top of each file |
| `declareExternallyReferenced` | `boolean` | `false` | Include externally referenced types inline |
| `enableConstEnums` | `boolean` | `false` | Generate `const enum` instead of `enum` |
| `unknownAny` | `boolean` | `false` | Use `unknown` instead of `any` |
| `strictIndexSignatures` | `boolean` | `false` | Use strict index signatures |
| `style.singleQuote` | `boolean` | `true` | Use single quotes |
| `style.semi` | `boolean` | `true` | Include semicolons |
| `style.tabWidth` | `number` | `4` | Indentation width |
| `style.printWidth` | `number` | `120` | Max line width |
| `style.useTabs` | `boolean` | `false` | Use tabs instead of spaces |
| `style.bracketSpacing` | `boolean` | `true` | Spaces inside object braces |

### `LogLevel`

Enum controlling console output verbosity.

```typescript
import { LogLevel } from '@nest-toolbox/open-api-spec-to-ts';

LogLevel.NONE   // 0 — no output
LogLevel.ERROR  // 1 — errors only
LogLevel.INFO   // 2 — errors + info messages
```

## Examples

### Basic generation script

```typescript
// scripts/generate-types.ts
import { generate, LogLevel } from '@nest-toolbox/open-api-spec-to-ts';

async function main() {
  await generate('./docs/openapi.json', './src/generated/api-types', {
    verbosity: LogLevel.INFO,
  });
  console.log('Done!');
}

main();
```

Add to your `package.json`:

```json
{
  "scripts": {
    "generate:types": "ts-node scripts/generate-types.ts"
  }
}
```

### CLI-style usage with arguments

```typescript
// scripts/generate-types.ts
import { generate, LogLevel } from '@nest-toolbox/open-api-spec-to-ts';
import { argv } from 'yargs';

const openApiFilePath = argv.openApiPath as string || './openapi.json';
const interfacesDirPath = argv.interfacesPath as string || './interfaces';
const verbosity = (argv.verbosity as LogLevel) || LogLevel.INFO;

generate(openApiFilePath, interfacesDirPath, { verbosity });
```

```bash
npx ts-node scripts/generate-types.ts \
  --openApiPath='./docs/api-spec.json' \
  --interfacesPath='./src/types'
```

### Generated output structure

Given an OpenAPI spec with these schemas:

```json
{
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "name": { "type": "string" },
          "role": { "$ref": "#/components/schemas/Role" }
        }
      },
      "Role": {
        "type": "string",
        "enum": ["admin", "user", "guest"]
      }
    }
  }
}
```

The generator produces:

```
src/interfaces/
├── index.ts      # export * from './User';
│                 # export * from './Role';
├── User.ts       # import { Role } from './';
│                 # export interface User { id: number; name: string; role: Role; }
└── Role.ts       # export enum Role { ADMIN = 'admin', USER = 'user', GUEST = 'guest' }
```

### Custom formatting

```typescript
await generate('./openapi.json', './src/types', {
  verbosity: LogLevel.INFO,
  unknownAny: true,               // use `unknown` instead of `any`
  enableConstEnums: true,          // generate const enums
  style: {
    singleQuote: true,
    semi: false,                   // no semicolons
    tabWidth: 2,
    printWidth: 80,
  },
});
```

### Integration with NestJS build pipeline

```typescript
// scripts/prebuild.ts
import { generate, LogLevel } from '@nest-toolbox/open-api-spec-to-ts';

async function prebuild() {
  // Generate types from the API spec before compilation
  await generate(
    './docs/openapi.json',
    './src/generated/api-types',
    { verbosity: LogLevel.INFO },
  );
}

prebuild();
```

```json
{
  "scripts": {
    "prebuild": "ts-node scripts/prebuild.ts",
    "build": "nest build"
  }
}
```
