/**
 * Core request context store using AsyncLocalStorage.
 *
 * Provides a static API to get/set values anywhere in the request lifecycle
 * without injecting services or passing context through function arguments.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { ContextStore } from './types';

const storage = new AsyncLocalStorage<ContextStore>();

/**
 * Run a function within a request context.
 * All code executed within fn (including async operations) will have access
 * to the context store.
 *
 * @param store - The context store for this request
 * @param fn - The function to run within the context
 * @returns The return value of fn
 */
export function runWithContext<T>(store: ContextStore, fn: () => T): T {
  return storage.run(store, fn);
}

/**
 * Get the current context store, or undefined if outside a context.
 */
export function getStore(): ContextStore | undefined {
  return storage.getStore();
}

/**
 * Static API for accessing request context from anywhere.
 *
 * @example
 * ```typescript
 * import { RequestContext } from '@nest-toolbox/request-context';
 *
 * // In any service, repository, or helper
 * const reqId = RequestContext.requestId;
 * const userId = RequestContext.get<string>('userId');
 * RequestContext.set('tenantId', 'acme-corp');
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: class provides clean namespaced API for static access pattern
export class RequestContext {
  /**
   * Get the current request ID.
   * Returns undefined if called outside a request context.
   */
  static get requestId(): string | undefined {
    return storage.getStore()?.requestId;
  }

  /**
   * Get a typed value from the context store.
   *
   * @param key - The key to look up
   * @returns The value cast to T, or undefined if not found
   */
  static get<T = unknown>(key: string): T | undefined {
    return storage.getStore()?.values.get(key) as T | undefined;
  }

  /**
   * Set a value in the context store.
   * No-op if called outside a request context.
   *
   * @param key - The key to set
   * @param value - The value to store
   */
  static set(key: string, value: unknown): void {
    storage.getStore()?.values.set(key, value);
  }

  /**
   * Check if a key exists in the context store.
   */
  static has(key: string): boolean {
    return storage.getStore()?.values.has(key) ?? false;
  }

  /**
   * Delete a key from the context store.
   */
  static delete(key: string): boolean {
    return storage.getStore()?.values.delete(key) ?? false;
  }

  /**
   * Get all key-value pairs from the context store.
   * Returns an empty map if called outside a request context.
   */
  static getAll(): ReadonlyMap<string, unknown> {
    return storage.getStore()?.values ?? new Map();
  }

  /**
   * Run a function within a request context.
   * Useful for testing or non-HTTP contexts (WebSockets, queues).
   *
   * @param requestId - The request ID for this context
   * @param fn - The function to run
   * @returns The return value of fn
   */
  static run<T>(requestId: string, fn: () => T): T {
    const store: ContextStore = { requestId, values: new Map() };
    return runWithContext(store, fn);
  }
}
