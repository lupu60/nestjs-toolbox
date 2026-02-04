/**
 * Decorators for @nest-toolbox/typeorm-audit-log
 */

import 'reflect-metadata';
import { AUDIT_IGNORE_KEY, AUDIT_MASK_KEY, AUDITABLE_KEY, AUDITABLE_OPTIONS_KEY, DEFAULT_MASK_FN } from './constants';
import type { AuditableOptions, AuditMaskOptions } from './types';

// biome-ignore lint/complexity/noBannedTypes: ClassDecorator requires Function type
type Constructor = Function;

/**
 * Marks an entity class as auditable.
 * All changes to this entity will be automatically logged.
 *
 * @example
 * ```typescript
 * @Entity()
 * @Auditable()
 * export class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Column()
 *   name: string;
 * }
 * ```
 *
 * @example With options
 * ```typescript
 * @Entity()
 * @Auditable({
 *   entityName: 'UserAccount',
 *   excludeFields: ['lastLoginAt']
 * })
 * export class User {
 *   // ...
 * }
 * ```
 */
export function Auditable(options?: AuditableOptions): ClassDecorator {
  return (target: Constructor) => {
    Reflect.defineMetadata(AUDITABLE_KEY, true, target);
    if (options) {
      Reflect.defineMetadata(AUDITABLE_OPTIONS_KEY, options, target);
    }
  };
}

/**
 * Check if an entity class is marked as auditable
 */
export function isAuditable(target: Constructor): boolean {
  return Reflect.getMetadata(AUDITABLE_KEY, target) === true;
}

/**
 * Get auditable options for an entity class
 */
export function getAuditableOptions(target: Constructor): AuditableOptions | undefined {
  return Reflect.getMetadata(AUDITABLE_OPTIONS_KEY, target);
}

/**
 * Get the entity name for auditing (custom name or class name)
 */
export function getAuditEntityName(target: Constructor): string {
  const options = getAuditableOptions(target);
  return options?.entityName || target.name;
}

/**
 * Get fields excluded from auditing for an entity
 */
export function getExcludedFields(target: Constructor): string[] {
  const options = getAuditableOptions(target);
  return options?.excludeFields || [];
}

/**
 * Marks a property to be excluded from audit logs entirely.
 * Use for sensitive data that should never appear in audit trails.
 *
 * @example
 * ```typescript
 * @Entity()
 * @Auditable()
 * export class User {
 *   @Column()
 *   @AuditIgnore()
 *   password: string;
 *
 *   @Column()
 *   @AuditIgnore()
 *   refreshToken: string;
 * }
 * ```
 */
export function AuditIgnore(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingIgnored = Reflect.getMetadata(AUDIT_IGNORE_KEY, target.constructor) || [];
    Reflect.defineMetadata(AUDIT_IGNORE_KEY, [...existingIgnored, propertyKey], target.constructor);
  };
}

/**
 * Get fields marked with @AuditIgnore for an entity
 */
export function getIgnoredFields(target: Constructor): (string | symbol)[] {
  return Reflect.getMetadata(AUDIT_IGNORE_KEY, target) || [];
}

/**
 * Marks a property to be masked in audit logs.
 * The value will be partially hidden (e.g., "jo***@email.com").
 *
 * @example
 * ```typescript
 * @Entity()
 * @Auditable()
 * export class User {
 *   @Column()
 *   @AuditMask()
 *   email: string;
 *
 *   @Column()
 *   @AuditMask({ maskFn: (v) => v ? '****' : null })
 *   ssn: string;
 * }
 * ```
 */
export function AuditMask(options?: AuditMaskOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingMasked = Reflect.getMetadata(AUDIT_MASK_KEY, target.constructor) || {};
    const maskFn = options?.maskFn || DEFAULT_MASK_FN;
    Reflect.defineMetadata(AUDIT_MASK_KEY, { ...existingMasked, [propertyKey]: maskFn }, target.constructor);
  };
}

/**
 * Get masked fields and their mask functions for an entity
 */
// biome-ignore lint/suspicious/noExplicitAny: mask functions can return any value
export function getMaskedFields(target: Constructor): Record<string | symbol, (value: any) => string> {
  return Reflect.getMetadata(AUDIT_MASK_KEY, target) || {};
}

/**
 * Check if a field should be ignored for an entity
 */
export function isFieldIgnored(target: Constructor, field: string | symbol): boolean {
  const ignoredFields = getIgnoredFields(target);
  return ignoredFields.includes(field);
}

/**
 * Get the mask function for a field, if any
 */
// biome-ignore lint/suspicious/noExplicitAny: mask functions can return any value
export function getFieldMaskFn(target: Constructor, field: string | symbol): ((value: any) => string) | undefined {
  const maskedFields = getMaskedFields(target);
  return maskedFields[field];
}
