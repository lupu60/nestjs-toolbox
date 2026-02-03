/**
 * Constants for @nest-toolbox/typeorm-audit-log
 */

/**
 * Metadata key for @Auditable() decorator
 */
export const AUDITABLE_KEY = 'audit:auditable';

/**
 * Metadata key for @AuditIgnore() decorator
 */
export const AUDIT_IGNORE_KEY = 'audit:ignore';

/**
 * Metadata key for @AuditMask() decorator
 */
export const AUDIT_MASK_KEY = 'audit:mask';

/**
 * Metadata key for auditable options
 */
export const AUDITABLE_OPTIONS_KEY = 'audit:auditable:options';

/**
 * Injection token for module options
 */
export const AUDIT_LOG_OPTIONS = 'AUDIT_LOG_OPTIONS';

/**
 * Default table name for audit logs
 */
export const DEFAULT_TABLE_NAME = 'audit_logs';

/**
 * Default mask function - masks middle characters
 * Example: "john@email.com" -> "jo***ail.com"
 */
// biome-ignore lint/suspicious/noExplicitAny: mask function accepts any value type
export const DEFAULT_MASK_FN = (value: any): string => {
  if (value === null || value === undefined) {
    return String(value);
  }

  const str = String(value);
  if (str.length <= 4) {
    return '***';
  }

  const visibleStart = Math.ceil(str.length * 0.2);
  const visibleEnd = Math.ceil(str.length * 0.2);

  return `${str.slice(0, visibleStart)}***${str.slice(str.length - visibleEnd)}`;
};
