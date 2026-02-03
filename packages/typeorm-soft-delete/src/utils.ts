import type { ObjectLiteral, Repository } from 'typeorm';

/**
 * Validate that entity has @DeleteDateColumn
 * Throws error if not found
 *
 * @param repository - TypeORM repository
 * @throws Error if entity doesn't have @DeleteDateColumn
 */
export function validateSoftDeleteSupport<T extends ObjectLiteral>(repository: Repository<T>): void {
  const metadata = repository.metadata;
  const deleteColumn = metadata.deleteDateColumn;

  if (!deleteColumn) {
    throw new Error(`Entity ${metadata.name} does not have @DeleteDateColumn. Soft delete requires a column decorated with @DeleteDateColumn.`);
  }
}

/**
 * Get delete date column name from repository metadata
 *
 * @param repository - TypeORM repository
 * @returns Database column name for the delete date column
 * @throws Error if entity doesn't have @DeleteDateColumn
 */
export function getDeleteDateColumnName<T extends ObjectLiteral>(repository: Repository<T>): string {
  const deleteColumn = repository.metadata.deleteDateColumn;
  if (!deleteColumn) {
    throw new Error('Entity does not have @DeleteDateColumn');
  }
  return deleteColumn.databaseName;
}

/**
 * Check if repository supports soft delete
 *
 * @param repository - TypeORM repository
 * @returns true if entity has @DeleteDateColumn, false otherwise
 */
export function supportsSoftDelete<T extends ObjectLiteral>(repository: Repository<T>): boolean {
  return !!repository.metadata.deleteDateColumn;
}

/**
 * Get primary column name(s) from repository
 *
 * @param repository - TypeORM repository
 * @returns Array of primary column property names
 */
export function getPrimaryColumns<T extends ObjectLiteral>(repository: Repository<T>): string[] {
  return repository.metadata.primaryColumns.map((col) => col.propertyName);
}
