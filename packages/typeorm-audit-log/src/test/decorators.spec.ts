import { describe, expect, it } from 'vitest';
import {
  Auditable,
  AuditIgnore,
  AuditMask,
  getAuditableOptions,
  getAuditEntityName,
  getExcludedFields,
  getFieldMaskFn,
  getIgnoredFields,
  getMaskedFields,
  isAuditable,
  isFieldIgnored,
} from '../decorators';

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

  describe('@AuditIgnore()', () => {
    it('should mark a field as ignored', () => {
      @Auditable()
      class TestEntity {
        @AuditIgnore()
        password: string = '';
      }

      expect(getIgnoredFields(TestEntity)).toContain('password');
    });

    it('should support multiple ignored fields', () => {
      @Auditable()
      class TestEntity {
        @AuditIgnore()
        password: string = '';

        @AuditIgnore()
        secret: string = '';

        name: string = '';
      }

      const ignored = getIgnoredFields(TestEntity);
      expect(ignored).toContain('password');
      expect(ignored).toContain('secret');
      expect(ignored).not.toContain('name');
    });

    it('should return empty array for entities without ignored fields', () => {
      @Auditable()
      class TestEntity {
        name: string = '';
      }

      expect(getIgnoredFields(TestEntity)).toEqual([]);
    });

    it('should correctly check if field is ignored', () => {
      @Auditable()
      class TestEntity {
        @AuditIgnore()
        password: string = '';

        name: string = '';
      }

      expect(isFieldIgnored(TestEntity, 'password')).toBe(true);
      expect(isFieldIgnored(TestEntity, 'name')).toBe(false);
    });
  });

  describe('@AuditMask()', () => {
    it('should mark a field for masking with default function', () => {
      @Auditable()
      class TestEntity {
        @AuditMask()
        email: string = '';
      }

      const masked = getMaskedFields(TestEntity);
      expect(masked).toHaveProperty('email');
      expect(typeof masked.email).toBe('function');
    });

    it('should use default mask function', () => {
      @Auditable()
      class TestEntity {
        @AuditMask()
        email: string = '';
      }

      const maskFn = getFieldMaskFn(TestEntity, 'email');
      expect(maskFn).toBeDefined();
      expect(maskFn?.('john@email.com')).toContain('***');
    });

    it('should support custom mask function', () => {
      const customMask = () => '[REDACTED]';

      @Auditable()
      class TestEntity {
        @AuditMask({ maskFn: customMask })
        ssn: string = '';
      }

      const maskFn = getFieldMaskFn(TestEntity, 'ssn');
      expect(maskFn?.('123-45-6789')).toBe('[REDACTED]');
    });

    it('should support multiple masked fields', () => {
      @Auditable()
      class TestEntity {
        @AuditMask()
        email: string = '';

        @AuditMask({ maskFn: () => '****' })
        phone: string = '';
      }

      const masked = getMaskedFields(TestEntity);
      expect(Object.keys(masked)).toHaveLength(2);
      expect(masked.email).toBeDefined();
      expect(masked.phone).toBeDefined();
    });

    it('should return undefined for non-masked fields', () => {
      @Auditable()
      class TestEntity {
        @AuditMask()
        email: string = '';

        name: string = '';
      }

      expect(getFieldMaskFn(TestEntity, 'email')).toBeDefined();
      expect(getFieldMaskFn(TestEntity, 'name')).toBeUndefined();
    });
  });
});
