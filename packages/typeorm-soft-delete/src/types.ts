import type { FindManyOptions, FindOptionsWhere } from 'typeorm';

/**
 * Options for soft delete operations
 */
export interface SoftDeleteOptions {
  /**
   * If true, throws an error when no entities are affected
   * @default false
   */
  validateExists?: boolean;
}

/**
 * Options for restore operations
 */
export interface RestoreOptions {
  /**
   * If true, throws an error when no entities are affected
   * @default false
   */
  validateExists?: boolean;
}

/**
 * Options for finding deleted records
 */
export interface FindDeletedOptions<T> extends Omit<FindManyOptions<T>, 'withDeleted'> {
  // Additional options can be added here in the future
}

/**
 * Options for counting records with soft delete awareness
 */
export interface CountOptions<T> extends FindManyOptions<T> {
  /**
   * If true, includes soft-deleted records in the count
   * @default false
   */
  includeDeleted?: boolean;
}

/**
 * Result of a soft delete operation
 */
export interface SoftDeleteResult {
  /**
   * Number of records affected by the operation
   */
  affected: number;
}

/**
 * Criteria for identifying entities to soft delete or restore
 * Can be:
 * - A single ID (string or number)
 * - An array of IDs
 * - A TypeORM FindOptionsWhere object
 */
export type SoftDeleteCriteria<T> = string | number | (string | number)[] | FindOptionsWhere<T>;
