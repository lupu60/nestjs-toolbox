import { getFieldMaskFn, getIgnoredFields } from '../decorators';

/**
 * Apply masking and field exclusions to entity values.
 * Uses @AuditIgnore and @AuditMask decorators from the entity class.
 *
 * @param values - The entity values to process
 * @param entityClass - The entity class constructor (for reading decorators)
 * @param globalExcludeFields - Additional fields to exclude globally
 * @returns Processed values with ignored fields removed and masked fields masked
 */
export function applyMaskAndExclusions(
  // biome-ignore lint/suspicious/noExplicitAny: entity values can be any type
  values: any,
  // biome-ignore lint/complexity/noBannedTypes: ClassDecorator requires Function type
  entityClass: Function | null,
  globalExcludeFields: string[] = [],
): Record<string, unknown> | null {
  if (!values) {
    return null;
  }

  const result: Record<string, unknown> = {};

  // Get ignored fields from decorator
  const ignoredFields = entityClass ? getIgnoredFields(entityClass) : [];

  for (const [key, value] of Object.entries(values)) {
    // Skip internal TypeORM properties
    if (key.startsWith('_')) {
      continue;
    }

    // Skip globally excluded fields
    if (globalExcludeFields.includes(key)) {
      continue;
    }

    // Skip fields marked with @AuditIgnore
    if (ignoredFields.includes(key)) {
      continue;
    }

    // Skip functions
    if (typeof value === 'function') {
      continue;
    }

    // Skip complex objects (relations) - just store primitives
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      continue;
    }

    // Check if field should be masked
    const maskFn = entityClass ? getFieldMaskFn(entityClass, key) : undefined;
    if (maskFn && value !== null && value !== undefined) {
      result[key] = maskFn(value);
    } else {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Get the list of all fields that should be excluded from audit logging.
 * Combines @AuditIgnore decorator fields with global exclusions.
 */
export function getAllExcludedFields(
  // biome-ignore lint/complexity/noBannedTypes: ClassDecorator requires Function type
  entityClass: Function | null,
  globalExcludeFields: string[] = [],
): string[] {
  const ignoredFields = entityClass ? getIgnoredFields(entityClass) : [];
  const combined = new Set([...globalExcludeFields, ...ignoredFields.map(String)]);
  return Array.from(combined);
}
