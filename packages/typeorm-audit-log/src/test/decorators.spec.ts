import { describe, expect, it } from 'vitest';
import { Auditable, getAuditableOptions, getAuditEntityName, getExcludedFields, isAuditable } from '../decorators';

describe('Decorators', () => {
  describe('@Auditable()', () => {
    it('should mark a class as auditable', () => {
      @Auditable()
      class TestEntity {}

      expect(isAuditable(TestEntity)).toBe(true);
    });

    it('should return false for non-auditable classes', () => {
      class NotAuditable {}

      expect(isAuditable(NotAuditable)).toBe(false);
    });

    it('should store custom entity name', () => {
      @Auditable({ entityName: 'CustomName' })
      class TestEntity {}

      expect(getAuditEntityName(TestEntity)).toBe('CustomName');
    });

    it('should use class name as default entity name', () => {
      @Auditable()
      class MyEntity {}

      expect(getAuditEntityName(MyEntity)).toBe('MyEntity');
    });

    it('should store excluded fields', () => {
      @Auditable({ excludeFields: ['password', 'secret'] })
      class TestEntity {}

      expect(getExcludedFields(TestEntity)).toEqual(['password', 'secret']);
    });

    it('should return empty array for no excluded fields', () => {
      @Auditable()
      class TestEntity {}

      expect(getExcludedFields(TestEntity)).toEqual([]);
    });

    it('should store full options object', () => {
      @Auditable({
        entityName: 'UserAccount',
        excludeFields: ['token'],
      })
      class TestEntity {}

      const options = getAuditableOptions(TestEntity);
      expect(options).toEqual({
        entityName: 'UserAccount',
        excludeFields: ['token'],
      });
    });

    it('should return undefined options for decorator without options', () => {
      @Auditable()
      class TestEntity {}

      expect(getAuditableOptions(TestEntity)).toBeUndefined();
    });
  });
});
