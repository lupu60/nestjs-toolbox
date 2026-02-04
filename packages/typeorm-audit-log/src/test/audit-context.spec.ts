import { describe, expect, it } from 'vitest';
import { AuditContext, auditContextRun, getAuditContext, setAuditContext } from '../audit-context';

describe('AuditContext', () => {
  describe('auditContextRun()', () => {
    it('should make context available within the callback', () => {
      const contextData = {
        userId: 'user-123',
        userName: 'John Doe',
        ip: '192.168.1.1',
      };

      auditContextRun(contextData, () => {
        const ctx = getAuditContext();
        expect(ctx).toEqual(contextData);
      });
    });

    it('should return the callback result', () => {
      const result = auditContextRun({ userId: 'test' }, () => {
        return 'hello';
      });

      expect(result).toBe('hello');
    });

    it('should isolate context between runs', () => {
      auditContextRun({ userId: 'user-1' }, () => {
        expect(getAuditContext()?.userId).toBe('user-1');
      });

      auditContextRun({ userId: 'user-2' }, () => {
        expect(getAuditContext()?.userId).toBe('user-2');
      });
    });

    it('should support nested runs with separate contexts', () => {
      auditContextRun({ userId: 'outer' }, () => {
        expect(getAuditContext()?.userId).toBe('outer');

        auditContextRun({ userId: 'inner' }, () => {
          expect(getAuditContext()?.userId).toBe('inner');
        });

        // Outer context should be restored
        expect(getAuditContext()?.userId).toBe('outer');
      });
    });
  });

  describe('getAuditContext()', () => {
    it('should return undefined outside of run context', () => {
      expect(getAuditContext()).toBeUndefined();
    });
  });

  describe('setAuditContext()', () => {
    it('should update existing context', () => {
      auditContextRun({ userId: 'original' }, () => {
        setAuditContext({ userName: 'Updated Name' });

        const ctx = getAuditContext();
        expect(ctx?.userId).toBe('original');
        expect(ctx?.userName).toBe('Updated Name');
      });
    });

    it('should do nothing outside of run context', () => {
      // Should not throw
      setAuditContext({ userId: 'test' });
      expect(getAuditContext()).toBeUndefined();
    });
  });

  describe('AuditContext class (static methods)', () => {
    it('should work the same as functional API', () => {
      AuditContext.run({ userId: 'class-user' }, () => {
        expect(AuditContext.get()?.userId).toBe('class-user');

        AuditContext.set({ ip: '10.0.0.1' });
        expect(AuditContext.get()?.ip).toBe('10.0.0.1');
      });
    });
  });

  describe('async context propagation', () => {
    it('should propagate context through async operations', async () => {
      await auditContextRun({ userId: 'async-user' }, async () => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(getAuditContext()?.userId).toBe('async-user');
      });
    });

    it('should propagate context through Promise.all', async () => {
      await auditContextRun({ userId: 'parallel-user' }, async () => {
        const results = await Promise.all([
          Promise.resolve().then(() => getAuditContext()?.userId),
          Promise.resolve().then(() => getAuditContext()?.userId),
        ]);

        expect(results).toEqual(['parallel-user', 'parallel-user']);
      });
    });
  });
});
