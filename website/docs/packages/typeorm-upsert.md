---
sidebar_label: "typeorm-upsert"
---

# @nest-toolbox/typeorm-upsert

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Ftypeorm-upsert.svg)](https://www.npmjs.com/package/@nest-toolbox/typeorm-upsert)

Bulk upsert (INSERT ... ON CONFLICT UPDATE) for TypeORM with chunking, key transforms, and insert/update status tracking. PostgreSQL compatible.

## Installation

```bash
npm install @nest-toolbox/typeorm-upsert
```

**Peer dependencies:** `typeorm`

:::caution PostgreSQL Only
This package generates raw PostgreSQL `ON CONFLICT` SQL. It is **not compatible** with MySQL, SQLite, or other databases.
:::

## Quick Start

```typescript
import { TypeOrmUpsert } from '@nest-toolbox/typeorm-upsert';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

// Upsert an array of products — existing rows updated, new rows inserted
const results = await TypeOrmUpsert(productRepository, products, 'sku');
```

## Features

- ⚡ **Bulk upsert** — INSERT ... ON CONFLICT ... DO UPDATE in a single query
- 📦 **Auto-chunking** — Splits large arrays into configurable batch sizes
- 🔑 **Flexible conflict keys** — Upsert on any unique constraint column
- 🔄 **Key name transforms** — Convert camelCase to snake_case (or any convention)
- 🚫 **Selective field exclusion** — Skip fields during the update phase
- 📊 **Status tracking** — Know which entities were inserted vs. updated
- ⏱️ **Auto `updatedAt`** — Automatically sets `updatedAt` to `CURRENT_TIMESTAMP`

## API Reference

### `TypeOrmUpsert<T>(repository, data, conflictKey, options?)`

Perform a bulk upsert operation using PostgreSQL `ON CONFLICT`.

```typescript
async function TypeOrmUpsert<T>(
  repository: Repository<T>,
  data: T | T[],
  conflictKey: string,
  options?: UpsertOptions,
): Promise<T[] | T | UpsertResult<T>[] | UpsertResult<T>>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `repository` | `Repository<T>` | TypeORM repository |
| `data` | `T \| T[]` | Single entity or array of entities to upsert |
| `conflictKey` | `string` | Column name of the unique constraint to match on |
| `options` | `UpsertOptions` | Optional configuration (see below) |

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `keyNamingTransform` | `(key: string) => string` | Identity `(k) => k` | Transform column names (e.g., camelCase → snake_case) |
| `doNotUpsert` | `string[]` | `[]` | Fields to exclude from the UPDATE clause — they'll be inserted for new rows but won't overwrite existing values |
| `chunk` | `number` | `1000` | Number of records per INSERT batch |
| `returnStatus` | `boolean` | `false` | If `true`, returns `UpsertResult<T>[]` with insert/update status |

**Returns:**

| When | Return Type | Description |
|---|---|---|
| Single entity, `returnStatus: false` | `T` | The upserted entity |
| Array, `returnStatus: false` | `T[]` | Array of upserted entities |
| Single entity, `returnStatus: true` | `UpsertResult<T>` | Entity with status |
| Array, `returnStatus: true` | `UpsertResult<T>[]` | Array of entities with status |

### Types

```typescript
type UpsertStatus = 'inserted' | 'updated';

interface UpsertResult<T> {
  entity: T;
  status: UpsertStatus;  // 'inserted' or 'updated'
}
```

## Examples

### Basic upsert

```typescript
import { TypeOrmUpsert } from '@nest-toolbox/typeorm-upsert';

const products = [
  { sku: 'ABC-001', name: 'Widget', price: 9.99 },
  { sku: 'ABC-002', name: 'Gadget', price: 19.99 },
];

const result = await TypeOrmUpsert(productRepo, products, 'sku');
// Inserts new SKUs, updates existing ones
```

### Track insert vs. update status

```typescript
const results = await TypeOrmUpsert(productRepo, products, 'sku', {
  returnStatus: true,
});

for (const result of results) {
  console.log(`${result.entity.sku} was ${result.status}`);
  // "ABC-001 was updated"
  // "ABC-002 was inserted"
}
```

### Exclude fields from update

Use `doNotUpsert` when a field should be set on insert but never overwritten:

```typescript
const users = [
  { externalId: 'ext-1', name: 'Alice', role: 'admin', createdBy: 'system' },
  { externalId: 'ext-2', name: 'Bob', role: 'user', createdBy: 'system' },
];

await TypeOrmUpsert(userRepo, users, 'externalId', {
  doNotUpsert: ['createdBy', 'role'],
  // createdBy and role are set on insert, but existing values are kept on update
});
```

### Key naming transform (camelCase → snake_case)

If your TypeORM entities use camelCase but the database columns are snake_case:

```typescript
import { snakeCase } from 'change-case';

await TypeOrmUpsert(repo, data, 'external_id', {
  keyNamingTransform: snakeCase,
});
```

### Custom chunk size for large datasets

```typescript
const millionProducts = [/* ... 1,000,000 items */];

await TypeOrmUpsert(productRepo, millionProducts, 'sku', {
  chunk: 5000, // 5000 records per INSERT statement
});
```

### Single entity upsert

```typescript
const product = { sku: 'ABC-001', name: 'Updated Widget', price: 12.99 };

const result = await TypeOrmUpsert(productRepo, product, 'sku');
// Returns a single entity (not an array)
```

### NestJS service integration

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmUpsert } from '@nest-toolbox/typeorm-upsert';
import { Product } from './product.entity';

@Injectable()
export class ProductSyncService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  async syncFromExternalApi(externalProducts: ExternalProduct[]) {
    const entities = externalProducts.map((p) => ({
      sku: p.sku,
      name: p.title,
      price: p.price,
      lastSyncedAt: new Date(),
    }));

    const results = await TypeOrmUpsert(this.productRepo, entities, 'sku', {
      doNotUpsert: ['createdAt'],
      returnStatus: true,
    });

    const inserted = results.filter((r) => r.status === 'inserted').length;
    const updated = results.filter((r) => r.status === 'updated').length;

    return { inserted, updated, total: results.length };
  }
}
```

## How It Works

1. **Key extraction** — Reads columns from the first entity in the array
2. **Exclusion** — Removes `doNotUpsert` fields from the SET clause
3. **Chunking** — Splits the data array into batches (default: 1000)
4. **Query generation** — Builds `INSERT INTO ... ON CONFLICT ("conflictKey") DO UPDATE SET ...` with `RETURNING *`
5. **Auto timestamp** — Always appends `"updatedAt" = CURRENT_TIMESTAMP` to the SET clause
6. **Status detection** (optional) — Pre-queries existing conflict keys to determine inserted vs. updated

:::note
The `updatedAt` column is automatically set to `CURRENT_TIMESTAMP` on every upsert. Make sure your entity has an `updatedAt` column.
:::
