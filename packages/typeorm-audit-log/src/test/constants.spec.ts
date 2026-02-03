import { describe, expect, it } from 'vitest';
import { AUDIT_IGNORE_KEY, AUDIT_LOG_OPTIONS, AUDIT_MASK_KEY, AUDITABLE_KEY, DEFAULT_MASK_FN, DEFAULT_TABLE_NAME } from '../constants';

describe('Constants', () => {
  describe('Metadata keys', () => {
    it('should have correct AUDITABLE_KEY', () => {
      expect(AUDITABLE_KEY).toBe('audit:auditable');
    });

    it('should have correct AUDIT_IGNORE_KEY', () => {
      expect(AUDIT_IGNORE_KEY).toBe('audit:ignore');
    });

    it('should have correct AUDIT_MASK_KEY', () => {
      expect(AUDIT_MASK_KEY).toBe('audit:mask');
    });

    it('should have correct AUDIT_LOG_OPTIONS token', () => {
      expect(AUDIT_LOG_OPTIONS).toBe('AUDIT_LOG_OPTIONS');
    });
  });

  describe('DEFAULT_TABLE_NAME', () => {
    it('should be audit_logs', () => {
      expect(DEFAULT_TABLE_NAME).toBe('audit_logs');
    });
  });

  describe('DEFAULT_MASK_FN', () => {
    it('should mask middle characters of a string', () => {
      expect(DEFAULT_MASK_FN('john@email.com')).toMatch(/^jo.*com$/);
    });

    it('should return *** for short strings (4 chars or less)', () => {
      expect(DEFAULT_MASK_FN('test')).toBe('***');
      expect(DEFAULT_MASK_FN('abc')).toBe('***');
      expect(DEFAULT_MASK_FN('ab')).toBe('***');
    });

    it('should handle null values', () => {
      expect(DEFAULT_MASK_FN(null)).toBe('null');
    });

    it('should handle undefined values', () => {
      expect(DEFAULT_MASK_FN(undefined)).toBe('undefined');
    });

    it('should convert numbers to strings before masking', () => {
      const result = DEFAULT_MASK_FN(1234567890);
      expect(typeof result).toBe('string');
      expect(result).toContain('***');
    });

    it('should mask longer strings appropriately', () => {
      const result = DEFAULT_MASK_FN('this-is-a-very-long-secret-value');
      expect(result.startsWith('this')).toBe(true);
      expect(result.endsWith('value')).toBe(true);
      expect(result).toContain('***');
    });
  });
});
