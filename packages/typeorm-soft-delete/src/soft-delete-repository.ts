import type { FindManyOptions, FindOneOptions, ObjectLiteral, Repository } from 'typeorm';
import { count, findOnlyDeleted, findWithDeleted, forceDelete, isSoftDeleted, restore, softDelete } from './soft-delete-operations';
import type { CountOptions, RestoreOptions, SoftDeleteOptions, SoftDeleteResult } from './types';

/**
 * Optional wrapper class providing repository-style API
 * Users can choose between functions or this wrapper
 *
 * @example
 * ```typescript
 * const repo = withSoftDelete(userRepository);
 * await repo.softDelete(123);
 * await repo.restore(123);
 * ```
 */
export class SoftDeleteRepository<T extends ObjectLiteral> {
  constructor(private readonly repository: Repository<T>) {}

  // biome-ignore lint/suspicious/noExplicitAny: Generic Record requires any for dynamic keys
  async softDelete(criteria: string | number | (string | number)[] | Record<string, any>, options?: SoftDeleteOptions): Promise<SoftDeleteResult> {
    return softDelete(this.repository, criteria, options);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Generic Record requires any for dynamic keys
  async restore(criteria: string | number | (string | number)[] | Record<string, any>, options?: RestoreOptions): Promise<SoftDeleteResult> {
    return restore(this.repository, criteria, options);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Generic Record requires any for dynamic keys
  async forceDelete(criteria: string | number | (string | number)[] | Record<string, any>): Promise<SoftDeleteResult> {
    return forceDelete(this.repository, criteria);
  }

  async findWithDeleted(options?: FindManyOptions<T>): Promise<T[]> {
    return findWithDeleted(this.repository, options);
  }

  async findOnlyDeleted(options?: FindManyOptions<T>): Promise<T[]> {
    return findOnlyDeleted(this.repository, options);
  }

  async count(options?: CountOptions<T>): Promise<number> {
    return count(this.repository, options);
  }

  async isSoftDeleted(id: string | number): Promise<boolean> {
    return isSoftDeleted(this.repository, id);
  }

  // Delegate to underlying repository for normal operations
  find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  save<E extends T>(entity: E): Promise<E>;
  save<E extends T>(entities: E[]): Promise<E[]>;
  async save<E extends T>(entityOrEntities: E | E[]): Promise<E | E[]> {
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM save overload requires any
    return this.repository.save(entityOrEntities as any);
  }

  async remove(entity: T): Promise<T>;
  async remove(entities: T[]): Promise<T[]>;
  async remove(entityOrEntities: T | T[]): Promise<T | T[]> {
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM remove overload requires any
    return this.repository.remove(entityOrEntities as any);
  }
}

/**
 * Factory function to create wrapped repository
 *
 * @param repository - TypeORM repository to wrap
 * @returns Wrapped repository with soft delete methods
 *
 * @example
 * ```typescript
 * const userRepo = withSoftDelete(userRepository);
 * ```
 */
export function withSoftDelete<T extends ObjectLiteral>(repository: Repository<T>): SoftDeleteRepository<T> {
  return new SoftDeleteRepository(repository);
}
