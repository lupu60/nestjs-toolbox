---
sidebar_label: "typeorm-paginate"
---

# @nest-toolbox/typeorm-paginate

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Ftypeorm-paginate.svg)](https://www.npmjs.com/package/@nest-toolbox/typeorm-paginate)

Memory-efficient async iteration over TypeORM tables using cursor-based pagination. Process millions of rows without loading them all into memory.

## Installation

```bash
npm install @nest-toolbox/typeorm-paginate
```

**Peer dependencies:** `typeorm`

## Quick Start

```typescript
import { rows } from '@nest-toolbox/typeorm-paginate';
import { Repository } from 'typeorm';
import { User } from './user.entity';

// Iterate over every user, 100 at a time
for await (const user of rows<User>({
  repository: userRepository,
  where: {},
})) {
  console.log(user.name, `${user.progress}%`);
}
```

## Features

- 🔄 **Async iteration** — Process rows one-by-one with `for await...of`
- 📦 **Batch fetching** — Fetches pages behind the scenes for efficiency
- 📊 **Progress tracking** — Each row includes its index and progress percentage
- 🧩 **Set mode** — Yield entire pages as arrays instead of individual rows
- 🪶 **Lightweight** — A single file, zero dependencies beyond TypeORM
- 🔍 **Full TypeORM `where` support** — Filter with any `FindOptionsWhere`

## API Reference

### `rows<T>(options)`

Async generator that yields individual rows with pagination metadata. Fetches records in batches behind the scenes.

```typescript
async function* rows<T>(options: {
  repository: Repository<T>;
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  limit?: number;
  offset?: number;
}): AsyncGenerator<PaginatedRow<T>>
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `repository` | `Repository<T>` | *required* | TypeORM repository to paginate |
| `where` | `FindOptionsWhere<T> \| FindOptionsWhere<T>[]` | *required* | TypeORM where clause (`{}` for all rows) |
| `limit` | `number` | `100` | Number of rows fetched per page (batch size) |
| `offset` | `number` | `0` | Starting offset |

**Yields `PaginatedRow<T>`** — the entity with two extra properties:

| Property | Type | Description |
|---|---|---|
| `index` | `number` | 1-based index of the current row in the full result set |
| `progress` | `number` | Progress percentage (`0`–`100`) |

```typescript
for await (const user of rows<User>({
  repository: userRepo,
  where: { role: 'admin' },
  limit: 50,
})) {
  console.log(`#${user.index} ${user.name} (${user.progress}%)`);
}
```

### `set<T>(options)`

Async generator that yields entire pages (arrays) instead of individual rows. Useful when you want to process records in batches.

```typescript
async function* set<T>(options: {
  repository: Repository<T>;
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  limit?: number;
}): AsyncGenerator<T[]>
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `repository` | `Repository<T>` | *required* | TypeORM repository to paginate |
| `where` | `FindOptionsWhere<T> \| FindOptionsWhere<T>[]` | *required* | TypeORM where clause |
| `limit` | `number` | `100` | Page size |

```typescript
for await (const batch of set<User>({
  repository: userRepo,
  where: { active: true },
  limit: 500,
})) {
  console.log(`Processing batch of ${batch.length} users`);
  await processBatch(batch);
}
```

## Examples

### Process all rows with progress

```typescript
import { rows } from '@nest-toolbox/typeorm-paginate';

for await (const user of rows<User>({
  repository: userRepository,
  where: {},
})) {
  await sendWelcomeEmail(user.email);
  if (user.progress % 10 === 0) {
    console.log(`Progress: ${user.progress}%`);
  }
}
```

### Filter with complex where clauses

```typescript
import { MoreThan } from 'typeorm';

for await (const order of rows<Order>({
  repository: orderRepository,
  where: {
    status: 'pending',
    createdAt: MoreThan(new Date('2024-01-01')),
  },
  limit: 200,
})) {
  await processOrder(order);
}
```

### Batch processing with `set()`

```typescript
import { set } from '@nest-toolbox/typeorm-paginate';

for await (const batch of set<Product>({
  repository: productRepository,
  where: { needsReindex: true },
  limit: 1000,
})) {
  await searchEngine.indexBatch(batch);
}
```

### Start from a specific offset

```typescript
for await (const row of rows<LogEntry>({
  repository: logRepository,
  where: {},
  offset: 5000,  // Skip the first 5000 rows
  limit: 100,
})) {
  processLog(row);
}
```

### Integration with NestJS service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rows } from '@nest-toolbox/typeorm-paginate';
import { User } from './user.entity';

@Injectable()
export class UserMigrationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async migrateAllUsers() {
    let migrated = 0;

    for await (const user of rows<User>({
      repository: this.userRepository,
      where: { migrated: false },
      limit: 500,
    })) {
      await this.migrateUser(user);
      migrated++;
    }

    return { migrated };
  }
}
```
