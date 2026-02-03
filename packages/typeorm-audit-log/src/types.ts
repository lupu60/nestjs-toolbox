/**
 * Types for @nest-toolbox/typeorm-audit-log
 */

/**
 * Audit action types
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Represents a single field change in an audit log
 */
export interface AuditDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Context data captured for audit logging
 */
export interface AuditContextData {
  userId?: string;
  userName?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for @Auditable() decorator
 */
export interface AuditableOptions {
  /**
   * Custom entity name (defaults to class name)
   */
  entityName?: string;

  /**
   * Fields to exclude from audit logging for this entity
   */
  excludeFields?: string[];
}

/**
 * Options for @AuditMask() decorator
 */
export interface AuditMaskOptions {
  /**
   * Custom mask function. Defaults to masking middle characters.
   * @param value - The original value
   * @returns The masked value
   */
  maskFn?: (value: any) => string;
}

/**
 * Parameters for logging an audit entry
 */
export interface LogParams {
  action: AuditAction;
  entity: any;
  entityName: string;
  oldValues?: any;
}

/**
 * Options for finding audit logs by user
 */
export interface FindByUserOptions {
  since?: Date;
  until?: Date;
  entityName?: string;
  action?: AuditAction;
  limit?: number;
}

/**
 * Options for finding audit logs by entity
 */
export interface FindByEntityOptions {
  since?: Date;
  until?: Date;
  action?: AuditAction;
  limit?: number;
}

/**
 * Options for finding all audit logs
 */
export interface FindAllOptions {
  since?: Date;
  until?: Date;
  entityName?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  page?: number;
  limit?: number;
}

/**
 * Paginated result for audit log queries
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Module configuration options
 */
export interface AuditLogModuleOptions {
  /**
   * Storage type for audit logs
   * @default 'database'
   */
  storage?: 'database' | 'file' | 'webhook';

  /**
   * Custom table name for audit logs
   * @default 'audit_logs'
   */
  tableName?: string;

  /**
   * Number of days to retain audit logs (0 = forever)
   * @default 0
   */
  retentionDays?: number;

  /**
   * Fields to globally exclude from all audit logs
   */
  excludeFields?: string[];

  /**
   * Entity names to exclude from auditing
   */
  excludeEntities?: string[];

  /**
   * Webhook URL for webhook storage type
   */
  webhookUrl?: string;

  /**
   * File path for file storage type
   */
  filePath?: string;

  /**
   * Don't block on audit log writes
   * @default false
   */
  async?: boolean;

  /**
   * Batch size for bulk writes
   * @default 1
   */
  batchSize?: number;
}

/**
 * Async module options for forRootAsync
 */
export interface AuditLogModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<AuditLogModuleOptions> | AuditLogModuleOptions;
  inject?: any[];
  useClass?: any;
  useExisting?: any;
}
