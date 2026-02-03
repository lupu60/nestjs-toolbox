import { type FindManyOptions, IsNull, Not, type ObjectLiteral, type Repository } from 'typeorm';
import type { CountOptions, RestoreOptions, SoftDeleteCriteria, SoftDeleteOptions, SoftDeleteResult } from './types';
import { getDeleteDateColumnName, getPrimaryColumns, validateSoftDeleteSupport } from './utils';

/**
 * Soft delete entities by setting deletedAt to current timestamp
 *
 * @param repository - TypeORM repository
 * @param criteria - Entity ID(s) or FindOptionsWhere clause
 * @param options - Optional configuration
 * @returns Promise with number of affected records
 *
 * @example
 * ```typescript
 * // Single ID
 * await softDelete(userRepository, 123);
 *
 * // Multiple IDs
 * await softDelete(userRepository, [1, 2, 3]);
 *
 * // With where clause
 * await softDelete(userRepository, { email: 'test@example.com' });
 * ```
 */
export async function softDelete<T extends ObjectLiteral>(
  repository: Repository<T>,
  criteria: SoftDeleteCriteria<T>,
  options?: SoftDeleteOptions,
): Promise<SoftDeleteResult> {
  validateSoftDeleteSupport(repository);

  const deleteColumn = getDeleteDateColumnName(repository);
  const qb = repository
    .createQueryBuilder()
    .update()
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM QueryBuilder set requires any for dynamic keys
    .set({ [deleteColumn]: () => 'CURRENT_TIMESTAMP' } as any)
    .andWhere(`${deleteColumn} IS NULL`); // Only delete non-deleted records

  // Handle different criteria types
  if (typeof criteria === 'string' || typeof criteria === 'number') {
    const primaryColumns = getPrimaryColumns(repository);
    qb.where(`${primaryColumns[0]} = :id`, { id: criteria });
  } else if (Array.isArray(criteria)) {
    const primaryColumns = getPrimaryColumns(repository);
    qb.where(`${primaryColumns[0]} IN (:...ids)`, { ids: criteria });
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM QueryBuilder where clause requires any for dynamic types
    qb.where(criteria as any);
  }

  const result = await qb.execute();

  if (options?.validateExists && result.affected === 0) {
    throw new Error('Entity not found or already deleted');
  }

  return { affected: result.affected ?? 0 };
}

/**
 * Restore soft-deleted entities by setting deletedAt back to null
 *
 * @param repository - TypeORM repository
 * @param criteria - Entity ID(s) or FindOptionsWhere clause
 * @param options - Optional configuration
 * @returns Promise with number of affected records
 *
 * @example
 * ```typescript
 * await restore(userRepository, 123);
 * ```
 */
export async function restore<T extends ObjectLiteral>(
  repository: Repository<T>,
  criteria: SoftDeleteCriteria<T>,
  options?: RestoreOptions,
): Promise<SoftDeleteResult> {
  validateSoftDeleteSupport(repository);

  const deleteColumn = getDeleteDateColumnName(repository);
  const qb = repository
    .createQueryBuilder()
    .update()
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM QueryBuilder set requires any for dynamic keys
    .set({ [deleteColumn]: null } as any)
    .andWhere(`${deleteColumn} IS NOT NULL`); // Only restore deleted records

  // Handle different criteria types
  if (typeof criteria === 'string' || typeof criteria === 'number') {
    const primaryColumns = getPrimaryColumns(repository);
    qb.where(`${primaryColumns[0]} = :id`, { id: criteria });
  } else if (Array.isArray(criteria)) {
    const primaryColumns = getPrimaryColumns(repository);
    qb.where(`${primaryColumns[0]} IN (:...ids)`, { ids: criteria });
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM QueryBuilder where clause requires any for dynamic types
    qb.where(criteria as any);
  }

  const result = await qb.execute();

  if (options?.validateExists && result.affected === 0) {
    throw new Error('Entity not found or not soft-deleted');
  }

  return { affected: result.affected ?? 0 };
}

/**
 * Permanently delete soft-deleted entities (hard delete)
 * Only deletes records where deletedAt IS NOT NULL
 *
 * @param repository - TypeORM repository
 * @param criteria - Entity ID(s) or FindOptionsWhere clause
 * @returns Promise with number of affected records
 *
 * @example
 * ```typescript
 * await forceDelete(userRepository, 123);
 * ```
 */
export async function forceDelete<T extends ObjectLiteral>(repository: Repository<T>, criteria: SoftDeleteCriteria<T>): Promise<SoftDeleteResult> {
  validateSoftDeleteSupport(repository);

  const deleteColumn = getDeleteDateColumnName(repository);
  const qb = repository.createQueryBuilder().delete().andWhere(`${deleteColumn} IS NOT NULL`); // Only hard delete already soft-deleted records

  // Handle criteria
  if (typeof criteria === 'string' || typeof criteria === 'number') {
    const primaryColumns = getPrimaryColumns(repository);
    qb.where(`${primaryColumns[0]} = :id`, { id: criteria });
  } else if (Array.isArray(criteria)) {
    const primaryColumns = getPrimaryColumns(repository);
    qb.where(`${primaryColumns[0]} IN (:...ids)`, { ids: criteria });
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM QueryBuilder where clause requires any for dynamic types
    qb.where(criteria as any);
  }

  const result = await qb.execute();
  return { affected: result.affected ?? 0 };
}

/**
 * Find entities including soft-deleted ones
 *
 * @param repository - TypeORM repository
 * @param options - Find options
 * @returns Promise with array of entities (including soft-deleted)
 *
 * @example
 * ```typescript
 * const allUsers = await findWithDeleted(userRepository);
 * ```
 */
export async function findWithDeleted<T extends ObjectLiteral>(repository: Repository<T>, options?: FindManyOptions<T>): Promise<T[]> {
  return repository.find({
    ...options,
    withDeleted: true,
  });
}

/**
 * Find only soft-deleted entities
 *
 * @param repository - TypeORM repository
 * @param options - Find options
 * @returns Promise with array of soft-deleted entities
 *
 * @example
 * ```typescript
 * const deletedUsers = await findOnlyDeleted(userRepository);
 * ```
 */
export async function findOnlyDeleted<T extends ObjectLiteral>(repository: Repository<T>, options?: FindManyOptions<T>): Promise<T[]> {
  validateSoftDeleteSupport(repository);

  const deleteColumn = getDeleteDateColumnName(repository);

  return repository.find({
    ...options,
    where: {
      // biome-ignore lint/suspicious/noExplicitAny: TypeORM where spread requires any
      ...(options?.where as any),
      [deleteColumn]: Not(IsNull()),
      // biome-ignore lint/suspicious/noExplicitAny: TypeORM where object requires any
    } as any,
    withDeleted: true,
  });
}

/**
 * Count entities with optional inclusion of soft-deleted
 *
 * @param repository - TypeORM repository
 * @param options - Count options
 * @returns Promise with count of entities
 *
 * @example
 * ```typescript
 * const activeCount = await count(userRepository);
 * const totalCount = await count(userRepository, { includeDeleted: true });
 * ```
 */
export async function count<T extends ObjectLiteral>(repository: Repository<T>, options?: CountOptions<T>): Promise<number> {
  const { includeDeleted, ...countOptions } = options || {};

  return repository.count({
    ...countOptions,
    withDeleted: includeDeleted,
  });
}

/**
 * Check if entity is soft-deleted
 *
 * @param repository - TypeORM repository
 * @param id - Entity ID
 * @returns Promise with boolean indicating if entity is soft-deleted
 * @throws Error if entity not found
 *
 * @example
 * ```typescript
 * if (await isSoftDeleted(userRepository, 123)) {
 *   console.log('User is deleted');
 * }
 * ```
 */
export async function isSoftDeleted<T extends ObjectLiteral>(repository: Repository<T>, id: string | number): Promise<boolean> {
  validateSoftDeleteSupport(repository);

  const primaryColumns = getPrimaryColumns(repository);
  const deleteColumn = getDeleteDateColumnName(repository);

  const entity = await repository.findOne({
    where: {
      [primaryColumns[0]]: id, // biome-ignore lint/suspicious/noExplicitAny: TypeORM where object requires any
    } as any,
    withDeleted: true,
  });

  if (!entity) {
    throw new Error('Entity not found');
  }

  return entity[deleteColumn] !== null;
}
