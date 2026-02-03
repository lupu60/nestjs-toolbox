// Core functions (Primary API)

// Decorators
export { getSoftDeleteConfig, isSoftDeletable, SoftDeletable, type SoftDeleteConfig } from './decorators';
export {
  count,
  findOnlyDeleted,
  findWithDeleted,
  forceDelete,
  isSoftDeleted,
  restore,
  softDelete,
} from './soft-delete-operations';
// Pagination integration
export {
  type PaginatedRow,
  type PaginationWithDeletedOptions,
  rowsOnlyDeleted,
  rowsWithDeleted,
} from './soft-delete-paginate';
// Optional wrapper (for method-based API)
export { SoftDeleteRepository, withSoftDelete } from './soft-delete-repository';
// Types
export type {
  CountOptions,
  FindDeletedOptions,
  RestoreOptions,
  SoftDeleteCriteria,
  SoftDeleteOptions,
  SoftDeleteResult,
} from './types';
// Utilities
export { getDeleteDateColumnName, supportsSoftDelete, validateSoftDeleteSupport } from './utils';
