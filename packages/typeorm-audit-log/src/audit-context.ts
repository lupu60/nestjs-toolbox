import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditContextData } from './types';

/**
 * Internal storage for audit context data.
 * Uses AsyncLocalStorage to propagate context across async boundaries.
 */
const storage = new AsyncLocalStorage<AuditContextData>();

/**
 * Run a function with the given audit context.
 * All code executed within fn (including async operations) will have access
 * to the provided context data.
 *
 * @param data - The audit context data to set
 * @param fn - The function to run with the context
 * @returns The return value of fn
 *
 * @example
 * ```typescript
 * // In middleware or guard
 * auditContextRun({
 *   userId: request.user.id,
 *   userName: request.user.email,
 *   ip: request.ip,
 * }, () => next());
 * ```
 */
export function auditContextRun<T>(data: AuditContextData, fn: () => T): T {
  return storage.run(data, fn);
}

/**
 * Get the current audit context data.
 * Returns undefined if called outside of a run() context.
 *
 * @returns The current context data or undefined
 *
 * @example
 * ```typescript
 * const context = getAuditContext();
 * console.log(context?.userId);
 * ```
 */
export function getAuditContext(): AuditContextData | undefined {
  return storage.getStore();
}

/**
 * Update the current audit context with additional data.
 * Merges the provided data with existing context.
 * No-op if called outside of a run() context.
 *
 * @param data - Partial data to merge into the current context
 */
export function setAuditContext(data: Partial<AuditContextData>): void {
  const current = getAuditContext();
  if (current) {
    Object.assign(current, data);
  }
}

/**
 * AuditContext class for backward compatibility and namespacing.
 * Provides static methods that wrap the exported functions.
 *
 * @example
 * ```typescript
 * AuditContext.run({ userId: 'user-1' }, () => {
 *   const ctx = AuditContext.get();
 * });
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: class provides namespacing for cleaner API
export class AuditContext {
  /**
   * Run a function with the given audit context.
   */
  static run<T>(data: AuditContextData, fn: () => T): T {
    return auditContextRun(data, fn);
  }

  /**
   * Get the current audit context data.
   */
  static get(): AuditContextData | undefined {
    return getAuditContext();
  }

  /**
   * Update the current audit context with additional data.
   */
  static set(data: Partial<AuditContextData>): void {
    setAuditContext(data);
  }
}
