import { describe, expect, it, vi } from 'vitest';
import type { IAuditLogService } from '../audit-log.subscriber';
import { AuditLogSubscriber } from '../audit-log.subscriber';
import { Auditable } from '../decorators';
import { AuditAction } from '../types';

// Mock auditable entity
@Auditable()
class TestEntity {
  id = 1;
  name = 'Test';
}

// Non-auditable entity
class RegularEntity {
  id = 1;
}

// Mock audit log service
function createMockService(): IAuditLogService & { logCalls: unknown[] } {
  const logCalls: unknown[] = [];
  return {
    logCalls,
    log: vi.fn().mockImplementation(async (params) => {
      logCalls.push(params);
    }),
  };
}

// Mock TypeORM event
function createMockEvent(entity: unknown, primaryColumns = [{ propertyName: 'id' }]) {
  return {
    entity,
    metadata: {
      name: entity?.constructor?.name ?? 'Unknown',
      primaryColumns,
    },
    databaseEntity: null,
  };
}

describe('AuditLogSubscriber', () => {
  describe('listenTo()', () => {
    it('should return undefined to listen to all entities', () => {
      const subscriber = new AuditLogSubscriber();
      expect(subscriber.listenTo()).toBeUndefined();
    });
  });

  describe('setAuditLogService()', () => {
    it('should set the audit log service', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();

      subscriber.setAuditLogService(mockService);

      // Verify by triggering an event
      const entity = new TestEntity();
      subscriber.afterInsert(createMockEvent(entity) as never);

      expect(mockService.log).toHaveBeenCalled();
    });
  });

  describe('registerWithDataSource()', () => {
    it('should add subscriber to DataSource subscribers array', () => {
      const subscriber = new AuditLogSubscriber();
      const mockDataSource = { subscribers: [] } as never;

      subscriber.registerWithDataSource(mockDataSource);

      expect((mockDataSource as { subscribers: unknown[] }).subscribers).toContain(subscriber);
    });

    it('should not add duplicate subscriber', () => {
      const subscriber = new AuditLogSubscriber();
      const mockDataSource = { subscribers: [] } as never;

      subscriber.registerWithDataSource(mockDataSource);
      subscriber.registerWithDataSource(mockDataSource);

      expect((mockDataSource as { subscribers: unknown[] }).subscribers.length).toBe(1);
    });
  });

  describe('afterInsert()', () => {
    it('should log CREATE action for auditable entities', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      const entity = new TestEntity();
      subscriber.afterInsert(createMockEvent(entity) as never);

      expect(mockService.logCalls[0]).toMatchObject({
        action: AuditAction.CREATE,
        entityName: 'TestEntity',
        entityId: '1',
      });
    });

    it('should not log for non-auditable entities', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      const entity = new RegularEntity();
      subscriber.afterInsert(createMockEvent(entity) as never);

      expect(mockService.log).not.toHaveBeenCalled();
    });

    it('should not throw when service is not set', () => {
      const subscriber = new AuditLogSubscriber();
      const entity = new TestEntity();

      expect(() => {
        subscriber.afterInsert(createMockEvent(entity) as never);
      }).not.toThrow();
    });
  });

  describe('afterUpdate()', () => {
    it('should log UPDATE action with old values', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      const entity = new TestEntity();
      entity.name = 'Updated';
      const oldEntity = { id: 1, name: 'Original' };

      const event = {
        ...createMockEvent(entity),
        databaseEntity: oldEntity,
      };

      subscriber.afterUpdate(event as never);

      expect(mockService.logCalls[0]).toMatchObject({
        action: AuditAction.UPDATE,
        entityName: 'TestEntity',
        oldValues: oldEntity,
      });
    });
  });

  describe('afterRemove()', () => {
    it('should log DELETE action', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      const entity = new TestEntity();
      const event = {
        ...createMockEvent(entity),
        databaseEntity: entity,
      };

      subscriber.afterRemove(event as never);

      expect(mockService.logCalls[0]).toMatchObject({
        action: AuditAction.DELETE,
        entityName: 'TestEntity',
      });
    });
  });

  describe('entity ID extraction', () => {
    it('should extract ID from single primary column', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      const entity = new TestEntity();
      entity.id = 42;
      subscriber.afterInsert(createMockEvent(entity) as never);

      expect(mockService.logCalls[0]).toMatchObject({
        entityId: '42',
      });
    });

    it('should handle composite primary keys', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      @Auditable()
      class CompositeEntity {
        tenantId = 'tenant-1';
        id = 'entity-1';
      }

      const entity = new CompositeEntity();
      const event = createMockEvent(entity, [{ propertyName: 'tenantId' }, { propertyName: 'id' }]);

      subscriber.afterInsert(event as never);

      expect(mockService.logCalls[0]).toMatchObject({
        entityId: 'tenant-1:entity-1',
      });
    });

    it('should fallback to common ID properties', () => {
      const subscriber = new AuditLogSubscriber();
      const mockService = createMockService();
      subscriber.setAuditLogService(mockService);

      @Auditable()
      class UuidEntity {
        uuid = 'abc-123';
      }

      const entity = new UuidEntity();
      const event = createMockEvent(entity, []);

      subscriber.afterInsert(event as never);

      expect(mockService.logCalls[0]).toMatchObject({
        entityId: 'abc-123',
      });
    });
  });
});
