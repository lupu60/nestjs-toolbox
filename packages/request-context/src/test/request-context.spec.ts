import { RequestContext, runWithContext, getStore } from '../request-context';
import type { ContextStore } from '../types';

describe('RequestContext', () => {
  describe('run()', () => {
    it('executes the function within a context', () => {
      let executed = false;
      RequestContext.run('test-id', () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('returns the value from the executed function', () => {
      const result = RequestContext.run('test-id', () => 42);
      expect(result).toBe(42);
    });
  });

  describe('requestId', () => {
    it('returns the correct ID inside a context', () => {
      RequestContext.run('my-request-id', () => {
        expect(RequestContext.requestId).toBe('my-request-id');
      });
    });

    it('returns undefined outside a context', () => {
      expect(RequestContext.requestId).toBeUndefined();
    });
  });

  describe('get()', () => {
    it('returns a typed value', () => {
      RequestContext.run('req-1', () => {
        RequestContext.set('count', 123);
        const value = RequestContext.get<number>('count');
        expect(value).toBe(123);
      });
    });

    it('returns undefined for a missing key', () => {
      RequestContext.run('req-1', () => {
        expect(RequestContext.get('nonexistent')).toBeUndefined();
      });
    });

    it('returns undefined outside a context', () => {
      expect(RequestContext.get('anything')).toBeUndefined();
    });
  });

  describe('set()', () => {
    it('stores a value retrievable via get()', () => {
      RequestContext.run('req-1', () => {
        RequestContext.set('user', { name: 'Alice' });
        expect(RequestContext.get('user')).toEqual({ name: 'Alice' });
      });
    });

    it('is a no-op outside a context', () => {
      // Should not throw
      expect(() => RequestContext.set('key', 'value')).not.toThrow();
      expect(RequestContext.get('key')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('returns true for existing keys', () => {
      RequestContext.run('req-1', () => {
        RequestContext.set('exists', true);
        expect(RequestContext.has('exists')).toBe(true);
      });
    });

    it('returns false for missing keys', () => {
      RequestContext.run('req-1', () => {
        expect(RequestContext.has('nope')).toBe(false);
      });
    });

    it('returns false outside a context', () => {
      expect(RequestContext.has('anything')).toBe(false);
    });
  });

  describe('delete()', () => {
    it('removes a key from the store', () => {
      RequestContext.run('req-1', () => {
        RequestContext.set('temp', 'data');
        expect(RequestContext.has('temp')).toBe(true);
        const result = RequestContext.delete('temp');
        expect(result).toBe(true);
        expect(RequestContext.has('temp')).toBe(false);
        expect(RequestContext.get('temp')).toBeUndefined();
      });
    });

    it('returns false outside a context', () => {
      expect(RequestContext.delete('anything')).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('returns all key-value pairs', () => {
      RequestContext.run('req-1', () => {
        RequestContext.set('a', 1);
        RequestContext.set('b', 'two');
        const all = RequestContext.getAll();
        expect(all.get('a')).toBe(1);
        expect(all.get('b')).toBe('two');
        expect(all.size).toBe(2);
      });
    });

    it('returns an empty map outside a context', () => {
      const all = RequestContext.getAll();
      expect(all.size).toBe(0);
    });
  });

  describe('nested contexts', () => {
    it('isolates inner context from outer context', () => {
      RequestContext.run('outer-id', () => {
        RequestContext.set('scope', 'outer');

        RequestContext.run('inner-id', () => {
          expect(RequestContext.requestId).toBe('inner-id');
          expect(RequestContext.get('scope')).toBeUndefined();
          RequestContext.set('scope', 'inner');
          expect(RequestContext.get('scope')).toBe('inner');
        });

        // Outer context is unaffected
        expect(RequestContext.requestId).toBe('outer-id');
        expect(RequestContext.get('scope')).toBe('outer');
      });
    });
  });

  describe('async operations', () => {
    it('preserves the store across async boundaries', async () => {
      await RequestContext.run('async-id', async () => {
        RequestContext.set('step', 1);

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(RequestContext.requestId).toBe('async-id');
        expect(RequestContext.get('step')).toBe(1);

        RequestContext.set('step', 2);

        await Promise.resolve();

        expect(RequestContext.get('step')).toBe(2);
      });
    });
  });
});

describe('runWithContext() and getStore()', () => {
  it('runWithContext sets the store accessible via getStore', () => {
    const store: ContextStore = { requestId: 'ctx-123', values: new Map() };
    store.values.set('key', 'val');

    runWithContext(store, () => {
      const retrieved = getStore();
      expect(retrieved).toBeDefined();
      expect(retrieved!.requestId).toBe('ctx-123');
      expect(retrieved!.values.get('key')).toBe('val');
    });
  });

  it('getStore returns undefined outside a context', () => {
    expect(getStore()).toBeUndefined();
  });

  it('runWithContext returns the function return value', () => {
    const store: ContextStore = { requestId: 'x', values: new Map() };
    const result = runWithContext(store, () => 'hello');
    expect(result).toBe('hello');
  });
});
