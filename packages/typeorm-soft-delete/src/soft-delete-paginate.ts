import { type FindOptionsWhere, IsNull, Not, type ObjectLiteral, type Repository } from 'typeorm';
import { getDeleteDateColumnName, supportsSoftDelete, validateSoftDeleteSupport } from './utils';

/**
 * Options for pagination with soft delete awareness
 */
export interface PaginationWithDeletedOptions<T extends ObjectLiteral> {
  /**
   * TypeORM repository
   */
  repository: Repository<T>;

  /**
   * Where clause for filtering entities
   */
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];

  /**
   * Number of records per page
   * @default 100
   */
  limit?: number;

  /**
   * Starting offset
   * @default 0
   */
  offset?: number;

  /**
   * Whether to include soft-deleted records
   * @default false
   */
  includeDeleted?: boolean;
}

/**
 * Result row with pagination metadata
 */
export interface PaginatedRow<T extends ObjectLiteral> {
  /**
   * The entity data
   */
  data: T;

  /**
   * Zero-based index of the current row
   */
  index: number;

  /**
   * Progress percentage (0-1)
   */
  progress: number;
}

/**
 * Paginate with soft delete awareness
 * By default excludes soft-deleted records
 *
 * @param options - Pagination options
 * @yields Paginated rows with metadata
 *
 * @example
 * ```typescript
 * for await (const row of rowsWithDeleted({
 *   repository: userRepo,
 *   where: {},
 *   includeDeleted: true
 * })) {
 *   console.log(row.data, row.progress);
 * }
 * ```
 */
export async function* rowsWithDeleted<T extends ObjectLiteral>(options: PaginationWithDeletedOptions<T>): AsyncGenerator<PaginatedRow<T>> {
  const { repository, where, limit = 100, offset = 0, includeDeleted = false } = options;

  // Build where clause with soft delete filter
  let finalWhere = where;
  if (!includeDeleted && supportsSoftDelete(repository)) {
    const deleteColumn = getDeleteDateColumnName(repository);
    finalWhere = Array.isArray(where) ? where.map((w) => ({ ...w, [deleteColumn]: IsNull() })) : { ...where, [deleteColumn]: IsNull() };
  }

  const total = await repository.count({ where: finalWhere as any, withDeleted: includeDeleted });
  let currentOffset = offset;
  let index = 0;

  while (currentOffset < total) {
    const rows = await repository.find({
      // biome-ignore lint/suspicious/noExplicitAny: TypeORM where requires any for dynamic types
      where: finalWhere as any,
      skip: currentOffset,
      take: limit,
      withDeleted: includeDeleted,
    });

    for (const row of rows) {
      yield {
        data: row,
        index: index++,
        progress: total > 0 ? index / total : 1,
      };
    }

    currentOffset += limit;
  }
}

/**
 * Paginate only soft-deleted records
 *
 * @param options - Pagination options
 * @yields Soft-deleted rows with metadata
 *
 * @example
 * ```typescript
 * for await (const row of rowsOnlyDeleted({
 *   repository: userRepo,
 *   where: {}
 * })) {
 *   console.log('Deleted user:', row.data);
 * }
 * ```
 */
export async function* rowsOnlyDeleted<T extends ObjectLiteral>(
  options: Omit<PaginationWithDeletedOptions<T>, 'includeDeleted'>,
): AsyncGenerator<PaginatedRow<T>> {
  const { repository, where, limit = 100, offset = 0 } = options;

  validateSoftDeleteSupport(repository);
  const deleteColumn = getDeleteDateColumnName(repository);

  // Add deletedAt IS NOT NULL filter
  const finalWhere = Array.isArray(where) ? where.map((w) => ({ ...w, [deleteColumn]: Not(IsNull()) })) : { ...where, [deleteColumn]: Not(IsNull()) };

  const total = await repository.count({
    // biome-ignore lint/suspicious/noExplicitAny: TypeORM where requires any for dynamic types
    where: finalWhere as any,
    withDeleted: true,
  });

  let currentOffset = offset;
  let index = 0;

  while (currentOffset < total) {
    const rows = await repository.find({
      // biome-ignore lint/suspicious/noExplicitAny: TypeORM where requires any for dynamic types
      where: finalWhere as any,
      skip: currentOffset,
      take: limit,
      withDeleted: true,
    });

    for (const row of rows) {
      yield {
        data: row,
        index: index++,
        progress: total > 0 ? index / total : 1,
      };
    }

    currentOffset += limit;
  }
}
