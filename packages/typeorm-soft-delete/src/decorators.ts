import 'reflect-metadata';

const SOFT_DELETABLE_KEY = Symbol('softDeletable');

/**
 * Configuration options for soft delete behavior
 */
export interface SoftDeleteConfig {
  /**
   * Name of the delete date column
   * @default 'deletedAt'
   */
  columnName?: string;

  /**
   * Whether to allow hard deletion of records
   * @default false
   */
  allowHardDelete?: boolean;
}

/**
 * Marks entity as soft-deletable
 * Stores metadata for validation and auto-configuration
 *
 * @param config - Optional configuration for soft delete behavior
 *
 * @example
 * ```typescript
 * @Entity()
 * @SoftDeletable({ columnName: 'deletedAt' })
 * class User {
 *   @DeleteDateColumn()
 *   deletedAt?: Date;
 * }
 * ```
 */
export function SoftDeletable(config?: SoftDeleteConfig): ClassDecorator {
  // biome-ignore lint/complexity/noBannedTypes: ClassDecorator requires Function type
  return (target: Function) => {
    const finalConfig: Required<SoftDeleteConfig> = {
      columnName: config?.columnName ?? 'deletedAt',
      allowHardDelete: config?.allowHardDelete ?? false,
    };
    Reflect.defineMetadata(SOFT_DELETABLE_KEY, finalConfig, target);
  };
}

/**
 * Get soft delete configuration from entity
 *
 * @param entity - Entity class or constructor function
 * @returns Configuration object if entity is marked as soft-deletable, undefined otherwise
 */
// biome-ignore lint/complexity/noBannedTypes: Reflect.getMetadata requires Function type
export function getSoftDeleteConfig(entity: Function): SoftDeleteConfig | undefined {
  return Reflect.getMetadata(SOFT_DELETABLE_KEY, entity);
}

/**
 * Check if entity is marked as soft-deletable
 *
 * @param entity - Entity class or constructor function
 * @returns true if entity has @SoftDeletable decorator, false otherwise
 */
// biome-ignore lint/complexity/noBannedTypes: Reflect.hasMetadata requires Function type
export function isSoftDeletable(entity: Function): boolean {
  return Reflect.hasMetadata(SOFT_DELETABLE_KEY, entity);
}
