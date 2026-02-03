import { Injectable } from '@nestjs/common';
import type { DataSource, EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { getAuditEntityName, isAuditable } from './decorators';
import { AuditAction, type LogParams } from './types';

/**
 * Interface for the audit log service that the subscriber depends on.
 * Allows for loose coupling and easier testing.
 */
export interface IAuditLogService {
  log(params: LogParams): Promise<void>;
}

/**
 * TypeORM event subscriber that captures entity changes and logs them.
 * Automatically detects entities decorated with @Auditable() and creates
 * audit log entries for INSERT, UPDATE, and DELETE operations.
 *
 * This subscriber is designed to be instantiated by NestJS DI and then
 * registered with the TypeORM DataSource.
 *
 * @example
 * ```typescript
 * // In your module
 * @Module({
 *   providers: [
 *     {
 *       provide: AuditLogSubscriber,
 *       useFactory: (dataSource: DataSource, auditLogService: AuditLogService) => {
 *         const subscriber = new AuditLogSubscriber(auditLogService);
 *         dataSource.subscribers.push(subscriber);
 *         return subscriber;
 *       },
 *       inject: [DataSource, AuditLogService],
 *     },
 *   ],
 * })
 * ```
 */
@Injectable()
export class AuditLogSubscriber implements EntitySubscriberInterface {
  private auditLogService: IAuditLogService | null = null;

  /**
   * Set the audit log service. Called during module initialization.
   */
  setAuditLogService(service: IAuditLogService): void {
    this.auditLogService = service;
  }

  /**
   * Register this subscriber with a TypeORM DataSource.
   */
  registerWithDataSource(dataSource: DataSource): void {
    if (!dataSource.subscribers.includes(this)) {
      dataSource.subscribers.push(this);
    }
  }

  /**
   * Listen to all entities (returns undefined).
   * Filtering is done in the event handlers based on @Auditable decorator.
   */
  listenTo(): undefined {
    return undefined;
  }

  /**
   * Handle entity insertion events.
   */
  afterInsert(event: InsertEvent<unknown>): void {
    this.handleEvent(event, AuditAction.CREATE);
  }

  /**
   * Handle entity update events.
   */
  afterUpdate(event: UpdateEvent<unknown>): void {
    this.handleEvent(event, AuditAction.UPDATE, event.databaseEntity);
  }

  /**
   * Handle entity removal events.
   */
  afterRemove(event: RemoveEvent<unknown>): void {
    this.handleEvent(event, AuditAction.DELETE, event.databaseEntity);
  }

  /**
   * Common handler for all entity events.
   */
  private handleEvent(
    event: InsertEvent<unknown> | UpdateEvent<unknown> | RemoveEvent<unknown>,
    action: AuditAction,
    // biome-ignore lint/suspicious/noExplicitAny: old values can be any entity type
    oldValues?: any,
  ): void {
    const entity = event.entity;

    // Skip if no entity or service not initialized
    if (!entity || !this.auditLogService) {
      return;
    }

    // Skip if entity is not marked as auditable
    if (!isAuditable(entity.constructor)) {
      return;
    }

    // Get entity name (custom or class name)
    const entityName = getAuditEntityName(entity.constructor);

    // Get entity ID from primary key
    const entityId = this.getEntityId(event, entity);

    // Log the audit entry (fire and forget - don't block the transaction)
    this.auditLogService
      .log({
        action,
        entity,
        entityName,
        entityId,
        oldValues,
      })
      .catch((error) => {
        // Log error but don't throw - audit failures shouldn't break the app
        console.error('[AuditLogSubscriber] Failed to log audit entry:', error);
      });
  }

  /**
   * Extract the entity ID from the event or entity.
   */
  private getEntityId(
    event: InsertEvent<unknown> | UpdateEvent<unknown> | RemoveEvent<unknown>,
    // biome-ignore lint/suspicious/noExplicitAny: entity can be any type
    entity: any,
  ): string {
    // Try to get ID from entity metadata (primary columns)
    const primaryColumns = event.metadata.primaryColumns;
    if (primaryColumns.length === 1) {
      const primaryColumn = primaryColumns[0];
      const value = entity[primaryColumn.propertyName];
      return String(value ?? 'unknown');
    }

    // For composite keys, join them
    if (primaryColumns.length > 1) {
      const ids = primaryColumns.map((col) => entity[col.propertyName]);
      return ids.join(':');
    }

    // Fallback: try common ID property names
    return String(entity.id ?? entity.uuid ?? entity._id ?? 'unknown');
  }
}
