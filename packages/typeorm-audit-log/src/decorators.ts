/**
 * Decorators for @nest-toolbox/typeorm-audit-log
 */

import 'reflect-metadata';
import { AUDITABLE_KEY, AUDITABLE_OPTIONS_KEY } from './constants';
import type { AuditableOptions } from './types';

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
