import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { getAuditContext } from './audit-context';
import { AuditLog } from './audit-log.entity';
import type { IAuditLogService } from './audit-log.subscriber';
import { AUDIT_LOG_OPTIONS } from './constants';
import type { AuditDiff, AuditLogModuleOptions, FindAllOptions, FindByEntityOptions, FindByUserOptions, LogParams, PaginatedResult } from './types';

/**
 * Service for logging and querying audit entries.
 * Captures entity changes with user attribution, diff calculation,
 * and request context (IP, user agent, metadata).
 *
 * @example
 * ```typescript
 * // Query audit history for an entity
 * const history = await auditLogService.findByEntity('User', '123');
 *
 * // Query changes made by a specific user
 * const userChanges = await auditLogService.findByUser('user-456', {
 *   since: new Date('2024-01-01'),
 * });
 * ```
 */
@Injectable()
export class AuditLogService implements IAuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    @Inject(AUDIT_LOG_OPTIONS)
    private readonly options: AuditLogModuleOptions,
  ) {}

  /**
   * Log an audit entry for an entity change.
   * Automatically captures user context from AsyncLocalStorage.
   */
  async log(params: LogParams): Promise<void> {
    const context = getAuditContext();

    // Calculate diff between old and new values
    const diff = this.calculateDiff(params.oldValues, params.entity);

    // Create audit log entry
    const entry = this.repo.create({
      entityName: params.entityName,
      entityId: params.entityId,
      action: params.action,
      userId: context?.userId ?? null,
      userName: context?.userName ?? null,
      oldValues: this.sanitizeValues(params.oldValues),
      newValues: this.sanitizeValues(params.entity),
      diff,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
      metadata: context?.metadata ?? null,
    });

    // Save the audit log
    if (this.options.async) {
      // Fire and forget for async mode
      this.repo.save(entry).catch((error) => {
        console.error('[AuditLogService] Failed to save audit log:', error);
      });
    } else {
      await this.repo.save(entry);
    }
  }

  /**
   * Find audit logs for a specific entity.
   */
  async findByEntity(entityName: string, entityId: string, options?: FindByEntityOptions): Promise<AuditLog[]> {
    const query = this.repo
      .createQueryBuilder('audit')
      .where('audit.entityName = :entityName', { entityName })
      .andWhere('audit.entityId = :entityId', { entityId });

    if (options?.since) {
      query.andWhere('audit.timestamp >= :since', { since: options.since });
    }

    if (options?.until) {
      query.andWhere('audit.timestamp <= :until', { until: options.until });
    }

    if (options?.action) {
      query.andWhere('audit.action = :action', { action: options.action });
    }

    query.orderBy('audit.timestamp', 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }

    return query.getMany();
  }

  /**
   * Find audit logs by user ID.
   */
  async findByUser(userId: string, options?: FindByUserOptions): Promise<AuditLog[]> {
    const query = this.repo.createQueryBuilder('audit').where('audit.userId = :userId', { userId });

    if (options?.since) {
      query.andWhere('audit.timestamp >= :since', { since: options.since });
    }

    if (options?.until) {
      query.andWhere('audit.timestamp <= :until', { until: options.until });
    }

    if (options?.entityName) {
      query.andWhere('audit.entityName = :entityName', { entityName: options.entityName });
    }

    if (options?.action) {
      query.andWhere('audit.action = :action', { action: options.action });
    }

    query.orderBy('audit.timestamp', 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }

    return query.getMany();
  }

  /**
   * Find all audit logs with optional filters and pagination.
   */
  async findAll(options?: FindAllOptions): Promise<PaginatedResult<AuditLog>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const query = this.repo.createQueryBuilder('audit');

    if (options?.since) {
      query.andWhere('audit.timestamp >= :since', { since: options.since });
    }

    if (options?.until) {
      query.andWhere('audit.timestamp <= :until', { until: options.until });
    }

    if (options?.entityName) {
      query.andWhere('audit.entityName = :entityName', { entityName: options.entityName });
    }

    if (options?.entityId) {
      query.andWhere('audit.entityId = :entityId', { entityId: options.entityId });
    }

    if (options?.userId) {
      query.andWhere('audit.userId = :userId', { userId: options.userId });
    }

    if (options?.action) {
      query.andWhere('audit.action = :action', { action: options.action });
    }

    query.orderBy('audit.timestamp', 'DESC');

    const [items, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate diff between old and new values.
   */
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  private calculateDiff(oldValues: any, newValues: any): AuditDiff[] | null {
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

      const oldVal = oldValues[key];
      const newVal = newValues[key];

      // Skip if both are objects (nested entities) - would need deep-diff for those
      if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
        continue;
      }

      // Check if values are different
      if (oldVal !== newVal) {
        diff.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    return diff.length > 0 ? diff : null;
  }

  /**
   * Sanitize entity values for storage.
   * Removes circular references and internal TypeORM properties.
   */
  // biome-ignore lint/suspicious/noExplicitAny: entity can be any type
  private sanitizeValues(values: any): Record<string, unknown> | null {
    if (!values) {
      return null;
    }

    const result: Record<string, unknown> = {};
    const excludeFields = this.options.excludeFields ?? [];

    for (const [key, value] of Object.entries(values)) {
      // Skip internal TypeORM properties
      if (key.startsWith('_')) {
        continue;
      }

      // Skip globally excluded fields
      if (excludeFields.includes(key)) {
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

      result[key] = value;
    }

    return Object.keys(result).length > 0 ? result : null;
  }
}
