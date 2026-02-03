import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { AuditAction, AuditDiff } from './types';

/**
 * Entity for storing audit log entries.
 * Tracks all changes to entities decorated with @Auditable().
 */
@Entity('audit_logs')
@Index(['entityName', 'entityId'])
@Index(['userId'])
@Index(['timestamp'])
@Index(['entityName', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Name of the entity that was modified
   */
  @Column({ type: 'varchar', length: 255 })
  entityName: string;

  /**
   * ID of the entity that was modified
   */
  @Column({ type: 'varchar', length: 255 })
  entityId: string;

  /**
   * Type of action performed (CREATE, UPDATE, DELETE)
   */
  @Column({
    type: 'varchar',
    length: 10,
  })
  action: AuditAction;

  /**
   * ID of the user who made the change
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  userId: string | null;

  /**
   * Name/email of the user who made the change
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  userName: string | null;

  /**
   * Previous values of changed fields (for UPDATE/DELETE)
   */
  @Column({ type: 'jsonb', nullable: true })
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  oldValues: Record<string, any> | null;

  /**
   * New values of changed fields (for CREATE/UPDATE)
   */
  @Column({ type: 'jsonb', nullable: true })
  // biome-ignore lint/suspicious/noExplicitAny: values can be any type
  newValues: Record<string, any> | null;

  /**
   * Computed diff of changes between old and new values
   */
  @Column({ type: 'jsonb', nullable: true })
  diff: AuditDiff[] | null;

  /**
   * Additional metadata captured at audit time
   */
  @Column({ type: 'jsonb', nullable: true })
  // biome-ignore lint/suspicious/noExplicitAny: metadata can contain any value
  metadata: Record<string, any> | null;

  /**
   * IP address of the request that triggered the change
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  /**
   * User agent of the request that triggered the change
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  /**
   * Timestamp when the audit log was created
   */
  @CreateDateColumn()
  timestamp: Date;
}
