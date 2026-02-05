---
sidebar_label: "typeorm-soft-delete"
---

# @nest-toolbox/typeorm-soft-delete

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Ftypeorm-soft-delete.svg)](https://www.npmjs.com/package/@nest-toolbox/typeorm-soft-delete)

Soft delete utilities for TypeORM with enhanced developer experience — function-based API, restore support, query helpers, and pagination integration.

## Installation

```bash
npm install @nest-toolbox/typeorm-soft-delete typeorm reflect-metadata
```

**Peer dependencies:** `typeorm`, `reflect-metadata`

## Quick Start

### 1. Add `@DeleteDateColumn` to your entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
```

### 2. Use the functions

```typescript
import { softDelete, restore, findOnlyDeleted } from '@nest-toolbox/typeorm-soft-delete';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async deleteUser(id: number) {
    await softDelete(this.userRepository, id);
  }

  async restoreUser(id: number) {
    await restore(this.userRepository, id);
  }

  async getDeletedUsers() {
    return findOnlyDeleted(this.userRepository);
  }
}
```

## Features

- 🎯 **Function-based API** — Import and call, no class extension required
- 🔧 **Optional repository wrapper** — `withSoftDelete()` for method-based DX
- 🔍 **Query utilities** — `findOnlyDeleted()`, `findWithDeleted()`, `isSoftDeleted()`
- 🛡️ **Safety checks** — `forceDelete()` only hard-deletes already soft-deleted records
- 📊 **Pagination integration** — Works seamlessly with `@nest-toolbox/typeorm-paginate`
- ✅ **Validation mode** — Throw errors when no entities are affected
- 🎨 **TypeScript-first** — Full type safety with exported types

## API Reference

### Core Functions

#### `softDelete(repository, criteria, options?)`

Soft delete entities by setting `deletedAt` to the current timestamp. Only affects records where `deletedAt IS NULL`.

```typescript
import { softDelete } from '@nest-toolbox/typeorm-soft-delete';

// Single ID
await softDelete(repo, 123);

// Multiple IDs
await softDelete(repo, [1, 2, 3]);

// Where clause
await softDelete(repo, { email: 'old@example.com' });

// With validation (throws if nothing affected)
await softDelete(repo, 123, { validateExists: true });
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `repository` | `Repository<T>` | TypeORM repository |
| `criteria` | `SoftDeleteCriteria<T>` | ID, array of IDs, or `FindOptionsWhere<T>` |
| `options` | `SoftDeleteOptions` | Optional — `{ validateExists?: boolean }` |

**Returns:** `Promise<SoftDeleteResult>` — `{ affected: number }`

---

#### `restore(repository, criteria, options?)`

Restore soft-deleted entities by setting `deletedAt` back to `null`. Only affects records where `deletedAt IS NOT NULL`.

```typescript
import { restore } from '@nest-toolbox/typeorm-soft-delete';

await restore(repo, 123);
await restore(repo, [1, 2, 3]);
await restore(repo, 123, { validateExists: true });
```

**Parameters:** Same as `softDelete()`.

**Returns:** `Promise<SoftDeleteResult>` — `{ affected: number }`

---

#### `forceDelete(repository, criteria)`

Permanently delete entities from the database. **Safety feature:** only deletes records where `deletedAt IS NOT NULL` — you can't accidentally hard-delete active records.

```typescript
import { forceDelete } from '@nest-toolbox/typeorm-soft-delete';

await forceDelete(repo, 123);
await forceDelete(repo, [1, 2, 3]);
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `repository` | `Repository<T>` | TypeORM repository |
| `criteria` | `SoftDeleteCriteria<T>` | ID, array of IDs, or `FindOptionsWhere<T>` |

**Returns:** `Promise<SoftDeleteResult>` — `{ affected: number }`

---

#### `findWithDeleted(repository, options?)`

Find entities **including** soft-deleted ones.

```typescript
import { findWithDeleted } from '@nest-toolbox/typeorm-soft-delete';

const allUsers = await findWithDeleted(repo);

const admins = await findWithDeleted(repo, {
  where: { role: 'admin' },
  take: 10,
});
```

**Returns:** `Promise<T[]>`

---

#### `findOnlyDeleted(repository, options?)`

Find **only** soft-deleted entities.

```typescript
import { findOnlyDeleted } from '@nest-toolbox/typeorm-soft-delete';

const deletedUsers = await findOnlyDeleted(repo);

const deletedAdmins = await findOnlyDeleted(repo, {
  where: { role: 'admin' },
});
```

**Returns:** `Promise<T[]>`

---

#### `count(repository, options?)`

Count entities with optional inclusion of soft-deleted records.

```typescript
import { count } from '@nest-toolbox/typeorm-soft-delete';

const activeCount = await count(repo);
const totalCount = await count(repo, { includeDeleted: true });
const adminCount = await count(repo, {
  where: { role: 'admin' },
  includeDeleted: false,
});
```

**`CountOptions<T>`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `includeDeleted` | `boolean` | `false` | Include soft-deleted in count |
| `where` | `FindOptionsWhere<T>` | — | Additional filter conditions |

**Returns:** `Promise<number>`

---

#### `isSoftDeleted(repository, id)`

Check if a specific entity is soft-deleted. Throws an error if the entity doesn't exist at all.

```typescript
import { isSoftDeleted } from '@nest-toolbox/typeorm-soft-delete';

if (await isSoftDeleted(repo, 123)) {
  console.log('User is soft-deleted');
}
```

**Returns:** `Promise<boolean>`

---

### Pagination Integration

Async generators that combine soft delete awareness with `@nest-toolbox/typeorm-paginate`-style iteration.

#### `rowsWithDeleted(options)`

Paginate through entities with soft delete awareness.

```typescript
import { rowsWithDeleted } from '@nest-toolbox/typeorm-soft-delete';

// Default: excludes soft-deleted
for await (const row of rowsWithDeleted({
  repository: userRepo,
  where: {},
  limit: 100,
})) {
  console.log(row.data.name, row.progress);
}

// Include soft-deleted
for await (const row of rowsWithDeleted({
  repository: userRepo,
  where: {},
  includeDeleted: true,
})) {
  console.log(row.data.name, row.data.deletedAt);
}
```

**`PaginationWithDeletedOptions<T>`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `repository` | `Repository<T>` | *required* | TypeORM repository |
| `where` | `FindOptionsWhere<T> \| FindOptionsWhere<T>[]` | *required* | Filter conditions |
| `limit` | `number` | `100` | Records per page |
| `offset` | `number` | `0` | Starting offset |
| `includeDeleted` | `boolean` | `false` | Include soft-deleted records |

**Yields `PaginatedRow<T>`:**

| Property | Type | Description |
|---|---|---|
| `data` | `T` | The entity |
| `index` | `number` | Zero-based index |
| `progress` | `number` | Progress ratio (0–1) |

#### `rowsOnlyDeleted(options)`

Paginate through **only** soft-deleted entities.

```typescript
import { rowsOnlyDeleted } from '@nest-toolbox/typeorm-soft-delete';

for await (const row of rowsOnlyDeleted({
  repository: userRepo,
  where: {},
})) {
  console.log('Deleted:', row.data.name, row.data.deletedAt);
}
```

---

### Decorator

#### `@SoftDeletable(config?)`

Optional decorator to mark an entity as soft-deletable and store metadata.

```typescript
import { SoftDeletable } from '@nest-toolbox/typeorm-soft-delete';

@Entity()
@SoftDeletable({ columnName: 'deletedAt', allowHardDelete: false })
export class User {
  @DeleteDateColumn()
  deletedAt?: Date;
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `columnName` | `string` | `'deletedAt'` | Name of the delete date column |
| `allowHardDelete` | `boolean` | `false` | Whether to allow hard deletion |

**Helper functions:**

- `isSoftDeletable(entityClass)` — Check if entity has `@SoftDeletable`
- `getSoftDeleteConfig(entityClass)` — Get the decorator config

---

### Repository Wrapper (Optional)

For those who prefer a method-based API, wrap your repository with `withSoftDelete()`.

```typescript
import { withSoftDelete, SoftDeleteRepository } from '@nest-toolbox/typeorm-soft-delete';

@Injectable()
export class UserService {
  private userRepo: SoftDeleteRepository<User>;

  constructor(@InjectRepository(User) repository: Repository<User>) {
    this.userRepo = withSoftDelete(repository);
  }

  async example() {
    await this.userRepo.softDelete(123);
    await this.userRepo.restore(123);
    await this.userRepo.forceDelete(123);

    const deleted = await this.userRepo.findOnlyDeleted();
    const all = await this.userRepo.findWithDeleted();
    const isDeleted = await this.userRepo.isSoftDeleted(123);
    const activeCount = await this.userRepo.count();

    // Standard repository methods still work
    const users = await this.userRepo.find({ where: { active: true } });
    await this.userRepo.save(newUser);
  }
}
```

---

### Utility Functions

```typescript
import {
  supportsSoftDelete,
  validateSoftDeleteSupport,
  getDeleteDateColumnName,
} from '@nest-toolbox/typeorm-soft-delete';

// Check if a repository supports soft delete
if (supportsSoftDelete(repo)) { /* ... */ }

// Throws descriptive error if not supported
validateSoftDeleteSupport(repo);

// Get the database column name for the delete date
const colName = getDeleteDateColumnName(repo); // e.g., 'deleted_at'
```

### Types

All types are exported from the package:

```typescript
import type {
  SoftDeleteCriteria,   // string | number | (string | number)[] | FindOptionsWhere<T>
  SoftDeleteResult,     // { affected: number }
  SoftDeleteOptions,    // { validateExists?: boolean }
  RestoreOptions,       // { validateExists?: boolean }
  CountOptions,         // extends FindManyOptions + { includeDeleted?: boolean }
  FindDeletedOptions,   // extends FindManyOptions (without withDeleted)
  PaginatedRow,         // { data: T, index: number, progress: number }
  SoftDeleteConfig,     // { columnName?: string, allowHardDelete?: boolean }
} from '@nest-toolbox/typeorm-soft-delete';
```

## Examples

### Cascading soft delete

```typescript
async deleteUserWithPosts(userId: number) {
  await softDelete(userRepo, userId);
  await softDelete(postRepo, { userId });
  await softDelete(commentRepo, { userId });
}
```

### Scheduled cleanup of old soft-deleted records

```typescript
import { Cron } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { findOnlyDeleted, forceDelete } from '@nest-toolbox/typeorm-soft-delete';

@Cron('0 0 * * *') // Daily at midnight
async cleanupOldDeleted() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldDeleted = await findOnlyDeleted(userRepo, {
    where: { deletedAt: LessThan(thirtyDaysAgo) },
  });

  for (const user of oldDeleted) {
    await forceDelete(userRepo, user.id);
  }
}
```

### Conditional soft delete with validation

```typescript
try {
  await softDelete(userRepo, 999, { validateExists: true });
} catch (error) {
  // "Entity not found or already deleted"
  console.error(error.message);
}
```

### Batch soft delete by condition

```typescript
import { Like } from 'typeorm';

// Soft delete all users from a specific domain
await softDelete(userRepo, { email: Like('%@old-domain.com') });
```
