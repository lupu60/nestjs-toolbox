import { diff as deepDiff } from 'deep-diff';
import type { AuditDiff } from '../types';

/**
 * Calculate the difference between two objects using deep-diff.
 * Returns an array of field changes suitable for audit logging.
 *
 * @param oldValues - The original object state
 * @param newValues - The new object state
 * @param excludeFields - Fields to exclude from diff calculation
 * @returns Array of AuditDiff entries, or null if no changes
 */
export function calculateDiff(
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  oldValues: any,
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  newValues: any,
  excludeFields: string[] = [],
): AuditDiff[] | null {
  if (!oldValues || !newValues) {
    return null;
  }

  const differences = deepDiff(oldValues, newValues);

  if (!differences || differences.length === 0) {
    return null;
  }

  const result: AuditDiff[] = [];

  for (const d of differences) {
    // Get the field path (e.g., 'address.city' for nested objects)
    const fieldPath = d.path?.join('.') ?? '';

    // Skip internal TypeORM properties
    if (fieldPath.startsWith('_')) {
      continue;
    }

    // Skip excluded fields
    const rootField = d.path?.[0]?.toString() ?? '';
    if (excludeFields.includes(rootField) || excludeFields.includes(fieldPath)) {
      continue;
    }

    // Handle different types of changes
    switch (d.kind) {
      case 'N': // New property
        result.push({
          field: fieldPath,
          oldValue: undefined,
          newValue: d.rhs,
        });
        break;

      case 'D': // Deleted property
        result.push({
          field: fieldPath,
          oldValue: d.lhs,
          newValue: undefined,
        });
        break;

      case 'E': // Edited property
        result.push({
          field: fieldPath,
          oldValue: d.lhs,
          newValue: d.rhs,
        });
        break;

      case 'A': // Array change
        // For arrays, we track the whole array change at the root level
        // rather than individual index changes for simplicity
        if (d.path && d.path.length > 0) {
          const arrayField = d.path.slice(0, -1).join('.');
          // Check if we already have this array in results
          if (!result.some((r) => r.field === arrayField)) {
            result.push({
              field: arrayField || rootField,
              oldValue: getNestedValue(oldValues, d.path.slice(0, -1)),
              newValue: getNestedValue(newValues, d.path.slice(0, -1)),
            });
          }
        }
        break;
    }
  }

  return result.length > 0 ? result : null;
}

/**
 * Get a nested value from an object using a path array.
 */
// biome-ignore lint/suspicious/noExplicitAny: utility function for any object
function getNestedValue(obj: any, path: (string | number)[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/**
 * Simple diff calculation for cases where deep-diff is not needed.
 * Only compares top-level primitive values.
 */
export function calculateSimpleDiff(
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  oldValues: any,
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  newValues: any,
  excludeFields: string[] = [],
): AuditDiff[] | null {
  if (!oldValues || !newValues) {
    return null;
  }

  const diff: AuditDiff[] = [];
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

  for (const key of allKeys) {
    // Skip internal TypeORM properties
    if (key.startsWith('_')) {
      continue;
    }

    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }

    const oldVal = oldValues[key];
    const newVal = newValues[key];

    // Skip complex objects (use calculateDiff for those)
    if (typeof oldVal === 'object' && oldVal !== null && !(oldVal instanceof Date)) {
      continue;
    }
    if (typeof newVal === 'object' && newVal !== null && !(newVal instanceof Date)) {
      continue;
    }

    // Compare values (handle Date objects)
    const oldCompare = oldVal instanceof Date ? oldVal.getTime() : oldVal;
    const newCompare = newVal instanceof Date ? newVal.getTime() : newVal;

    if (oldCompare !== newCompare) {
      diff.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return diff.length > 0 ? diff : null;
}
