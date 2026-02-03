# @nest-toolbox/typeorm-soft-delete

Soft delete utilities for TypeORM with enhanced developer experience.

## Features

- 🎯 **Function-based API** following TypeORM patterns
- 🔧 **Optional method-based wrapper** for enhanced DX
- 🔍 **Query utilities** for finding deleted records
- 📊 **Pagination integration** with `@nest-toolbox/typeorm-paginate`
- 🎨 **TypeScript-first** with full type safety
- ✅ **Well-tested** with 90%+ coverage

## Installation

```bash
npm install @nest-toolbox/typeorm-soft-delete typeorm reflect-metadata
```

## Quick Start

### 1. Setup Your Entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';
import { SoftDeletable } from '@nest-toolbox/typeorm-soft-delete';

@Entity()
@SoftDeletable() // Optional decorator for metadata
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @DeleteDateColumn() // Required - TypeORM's built-in soft delete column
  deletedAt?: Date;
}
```

### 2. Use Soft Delete Functions (Recommended)

```typescript
import { softDelete, restore, findOnlyDeleted } from '@nest-toolbox/typeorm-soft-delete';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async deleteUser(id: number) {
    // Soft delete by ID
    const result = await softDelete(this.userRepository, id);
    console.log(`Soft deleted ${result.affected} user(s)`);
  }

  async restoreUser(id: number) {
    // Restore soft-deleted user
    await restore(this.userRepository, id);
  }

  async getDeletedUsers() {
    // Find only deleted users
    return findOnlyDeleted(this.userRepository);
  }
}
```

### 3. Alternative: Method-Based API (Optional)

```typescript
import { withSoftDelete } from '@nest-toolbox/typeorm-soft-delete';

@Injectable()
export class UserService {
  private userRepo: SoftDeleteRepository<User>;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.userRepo = withSoftDelete(userRepository);
  }

  async deleteUser(id: number) {
    await this.userRepo.softDelete(id);
  }

  async restoreUser(id: number) {
    await this.userRepo.restore(id);
  }
}
```

## API Reference

### Core Functions

#### `softDelete(repository, criteria, options?)`

Soft delete entities by setting `deletedAt` to current timestamp.

**Parameters:**
- `repository: Repository<T>` - TypeORM repository
- `criteria: string | number | array | FindOptionsWhere<T>` - Entity ID(s) or where clause
- `options?: { validateExists?: boolean }` - Optional validation

**Returns:** `Promise<{ affected: number }>`

**Examples:**

```typescript
// Single ID
await softDelete(repo, 123);

// Multiple IDs
await softDelete(repo, [1, 2, 3]);

// Where clause
await softDelete(repo, { email: 'test@example.com' });

// With validation
await softDelete(repo, 123, { validateExists: true });
```

#### `restore(repository, criteria, options?)`

Restore soft-deleted entities by setting `deletedAt` back to null.

**Parameters:** Same as `softDelete()`

**Returns:** `Promise<{ affected: number }>`

**Examples:**

```typescript
// Restore single user
await restore(userRepo, 123);

// Restore multiple users
await restore(userRepo, [1, 2, 3]);

// Restore with validation
await restore(userRepo, 123, { validateExists: true });
```

#### `forceDelete(repository, criteria)`

Permanently delete soft-deleted entities (hard delete). Only deletes records where `deletedAt IS NOT NULL`.

**Safety:** This prevents accidentally hard-deleting active records.

**Examples:**

```typescript
// Permanently delete soft-deleted user
await forceDelete(userRepo, 123);

// Permanently delete multiple
await forceDelete(userRepo, [1, 2, 3]);
```

#### `findWithDeleted(repository, options?)`

Find entities including soft-deleted ones.

**Examples:**

```typescript
// Find all users including deleted
const allUsers = await findWithDeleted(userRepo);

// Find with additional options
const users = await findWithDeleted(userRepo, {
  where: { role: 'admin' },
  take: 10,
});
```

#### `findOnlyDeleted(repository, options?)`

Find only soft-deleted entities.

**Examples:**

```typescript
// Find all deleted users
const deletedUsers = await findOnlyDeleted(userRepo);

// Find deleted with filter
const deletedAdmins = await findOnlyDeleted(userRepo, {
  where: { role: 'admin' },
});
```

#### `count(repository, options?)`

Count entities with optional inclusion of soft-deleted.

**Examples:**

```typescript
// Count active users
const activeCount = await count(userRepo);

// Count all users including deleted
const totalCount = await count(userRepo, { includeDeleted: true });

// Count with filter
const adminCount = await count(userRepo, {
  where: { role: 'admin' },
  includeDeleted: false,
});
```

#### `isSoftDeleted(repository, id)`

Check if entity is soft-deleted.

**Examples:**

```typescript
if (await isSoftDeleted(userRepo, 123)) {
  console.log('User is deleted');
}
```

### Pagination Integration

Works seamlessly with `@nest-toolbox/typeorm-paginate`:

```typescript
import { rowsWithDeleted, rowsOnlyDeleted } from '@nest-toolbox/typeorm-soft-delete';

// Paginate excluding deleted (default)
for await (const row of rowsWithDeleted({
  repository: userRepo,
  where: {},
  limit: 100,
})) {
  console.log(row.data, row.progress);
}

// Paginate including deleted
for await (const row of rowsWithDeleted({
  repository: userRepo,
  where: {},
  includeDeleted: true,
})) {
  console.log(row.data);
}

// Paginate only deleted
for await (const row of rowsOnlyDeleted({
  repository: userRepo,
  where: {},
})) {
  console.log('Deleted:', row.data);
}
```

### Optional Repository Wrapper

For those who prefer method-based API:

```typescript
import { withSoftDelete, SoftDeleteRepository } from '@nest-toolbox/typeorm-soft-delete';

const userRepo: SoftDeleteRepository<User> = withSoftDelete(userRepository);

// All soft delete methods
await userRepo.softDelete(123);
await userRepo.restore(123);
await userRepo.forceDelete(123);
const deleted = await userRepo.findOnlyDeleted();
const all = await userRepo.findWithDeleted();
const isDeleted = await userRepo.isSoftDeleted(123);

// Standard repository methods still work
const users = await userRepo.find({ where: { active: true } });
const user = await userRepo.findOne({ where: { id: 1 } });
await userRepo.save(newUser);
```

## Database Setup

Ensure your database table has a `deletedAt` column:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP NULL, -- NULL = active, NOT NULL = deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommended: Index for performance
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

TypeORM will automatically handle the column when you use `@DeleteDateColumn()`:

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @DeleteDateColumn() // Creates nullable timestamp column
  deletedAt?: Date;
}
```

## Best Practices

### 1. Always Use @DeleteDateColumn

The package requires entities to have `@DeleteDateColumn()` decorator:

```typescript
@Entity()
export class User {
  @DeleteDateColumn()
  deletedAt?: Date; // Required for soft delete functionality
}
```

### 2. Add Database Index

Index the `deletedAt` column for better query performance:

```sql
CREATE INDEX idx_table_deleted_at ON your_table(deleted_at);
```

### 3. Use forceDelete() Carefully

Permanent deletion cannot be undone. The package only allows force deletion of already soft-deleted records as a safety measure:

```typescript
// Safe: Only permanently deletes records that are already soft-deleted
await forceDelete(repo, id);
```

### 4. Consider Cascading

Soft delete related entities to maintain referential integrity:

```typescript
async deleteUserWithPosts(userId: number) {
  // Soft delete user
  await softDelete(userRepo, userId);

  // Soft delete user's posts
  await softDelete(postRepo, { userId });
}
```

### 5. Regular Cleanup

Schedule jobs to permanently delete old soft-deleted records:

```typescript
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

## Migration from TypeORM Built-in

TypeORM has basic soft delete support via `repository.softDelete()`. This package provides enhanced functionality:

**TypeORM Built-in:**
- ✅ Basic soft delete with `softDelete(id)`
- ❌ No restore functionality
- ❌ No query utilities for deleted records
- ❌ No pagination integration
- ❌ Limited type safety

**This Package:**
- ✅ Enhanced soft delete operations
- ✅ Restore functionality
- ✅ Query utilities (`findOnlyDeleted`, `findWithDeleted`)
- ✅ Pagination integration
- ✅ Better type safety and validation
- ✅ Safety checks (forceDelete only deletes soft-deleted records)

**Before:**

```typescript
await repository.softDelete(id);
const deleted = await repository.find({ withDeleted: true });
```

**After:**

```typescript
await softDelete(repository, id);
const deleted = await findOnlyDeleted(repository);

// Or restore them
await restore(repository, id);
```

## Advanced Usage

### Batch Operations

Process large numbers of records efficiently:

```typescript
const userIds = [1, 2, 3, 4, 5, /* ... hundreds more */];

// Soft delete in bulk
const result = await softDelete(userRepo, userIds);
console.log(`Deleted ${result.affected} users`);
```

### Conditional Soft Delete

Use `FindOptionsWhere` for complex conditions:

```typescript
// Soft delete all inactive users
await softDelete(userRepo, { active: false });

// Soft delete users by email domain
await softDelete(userRepo, { email: Like('%@old-domain.com') });
```

### Validation

Ensure entities exist before deletion:

```typescript
try {
  await softDelete(userRepo, 999, { validateExists: true });
} catch (error) {
  console.error('User not found or already deleted');
}
```

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
import type {
  SoftDeleteCriteria,
  SoftDeleteResult,
  SoftDeleteOptions,
  RestoreOptions,
  CountOptions,
  PaginatedRow,
} from '@nest-toolbox/typeorm-soft-delete';

// Type-safe operations
const result: SoftDeleteResult = await softDelete(repo, 1);
console.log(`Affected: ${result.affected}`);
```

## Error Handling

The package provides clear error messages:

```typescript
// Missing @DeleteDateColumn
await softDelete(repoWithoutColumn, 1);
// Error: Entity User does not have @DeleteDateColumn.
//        Soft delete requires a column decorated with @DeleteDateColumn.

// Entity not found (with validation)
await restore(repo, 999, { validateExists: true });
// Error: Entity not found or not soft-deleted

// Check before operations
if (!supportsSoftDelete(repo)) {
  console.error('Repository does not support soft delete');
}
```

## Testing

Mock repositories in your tests:

```typescript
import { vi } from 'vitest';

const mockRepo = {
  metadata: {
    deleteDateColumn: { databaseName: 'deletedAt' },
    primaryColumns: [{ propertyName: 'id' }],
  },
  createQueryBuilder: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ affected: 1 }),
  }),
} as any;

const result = await softDelete(mockRepo, 1);
expect(result.affected).toBe(1);
```

## Contributing

Contributions are welcome! Please check out the [main repository](https://github.com/lupu60/nestjs-toolbox) for contributing guidelines.

## License

MIT

## Support

For issues and questions, please visit the [GitHub Issues](https://github.com/lupu60/nestjs-toolbox/issues) page.
