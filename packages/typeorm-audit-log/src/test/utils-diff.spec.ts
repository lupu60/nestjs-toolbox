import { describe, expect, it } from 'vitest';
import { calculateDiff, calculateSimpleDiff } from '../utils/diff';

describe('utils/diff', () => {
  describe('calculateDiff()', () => {
    it('should return null when oldValues is null', () => {
      expect(calculateDiff(null, { a: 1 })).toBeNull();
    });

    it('should return null when newValues is null', () => {
      expect(calculateDiff({ a: 1 }, null)).toBeNull();
    });

    it('should return null when no changes', () => {
      const obj = { name: 'John', age: 30 };
      expect(calculateDiff(obj, { ...obj })).toBeNull();
    });

    it('should detect simple property changes', () => {
      const old = { name: 'John', age: 30 };
      const updated = { name: 'Jane', age: 30 };

      const diff = calculateDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0]).toEqual({
        field: 'name',
        oldValue: 'John',
        newValue: 'Jane',
      });
    });

    it('should detect multiple changes', () => {
      const old = { name: 'John', age: 30, city: 'NYC' };
      const updated = { name: 'Jane', age: 31, city: 'NYC' };

      const diff = calculateDiff(old, updated);

      expect(diff).toHaveLength(2);
      expect(diff?.map((d) => d.field).sort()).toEqual(['age', 'name']);
    });

    it('should detect new properties', () => {
      const old = { name: 'John' };
      const updated = { name: 'John', email: 'john@test.com' };

      const diff = calculateDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0]).toEqual({
        field: 'email',
        oldValue: undefined,
        newValue: 'john@test.com',
      });
    });

    it('should detect deleted properties', () => {
      const old = { name: 'John', email: 'john@test.com' };
      const updated = { name: 'John' };

      const diff = calculateDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0]).toEqual({
        field: 'email',
        oldValue: 'john@test.com',
        newValue: undefined,
      });
    });

    it('should detect nested object changes', () => {
      const old = { name: 'John', address: { city: 'NYC', zip: '10001' } };
      const updated = { name: 'John', address: { city: 'LA', zip: '10001' } };

      const diff = calculateDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0].field).toBe('address.city');
      expect(diff?.[0].oldValue).toBe('NYC');
      expect(diff?.[0].newValue).toBe('LA');
    });

    it('should skip internal TypeORM properties', () => {
      const old = { name: 'John', _version: 1 };
      const updated = { name: 'Jane', _version: 2 };

      const diff = calculateDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0].field).toBe('name');
    });

    it('should respect excludeFields', () => {
      const old = { name: 'John', password: 'old' };
      const updated = { name: 'Jane', password: 'new' };

      const diff = calculateDiff(old, updated, ['password']);

      expect(diff).toHaveLength(1);
      expect(diff?.[0].field).toBe('name');
    });
  });

  describe('calculateSimpleDiff()', () => {
    it('should return null when oldValues is null', () => {
      expect(calculateSimpleDiff(null, { a: 1 })).toBeNull();
    });

    it('should return null when no changes', () => {
      const obj = { name: 'John', age: 30 };
      expect(calculateSimpleDiff(obj, { ...obj })).toBeNull();
    });

    it('should detect primitive changes', () => {
      const old = { name: 'John', age: 30 };
      const updated = { name: 'Jane', age: 30 };

      const diff = calculateSimpleDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0].field).toBe('name');
    });

    it('should skip complex objects', () => {
      const old = { name: 'John', address: { city: 'NYC' } };
      const updated = { name: 'John', address: { city: 'LA' } };

      const diff = calculateSimpleDiff(old, updated);

      // Should be null because address is an object
      expect(diff).toBeNull();
    });

    it('should handle Date objects', () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');
      const old = { createdAt: oldDate };
      const updated = { createdAt: newDate };

      const diff = calculateSimpleDiff(old, updated);

      expect(diff).toHaveLength(1);
      expect(diff?.[0].field).toBe('createdAt');
    });

    it('should respect excludeFields', () => {
      const old = { name: 'John', secret: 'a' };
      const updated = { name: 'Jane', secret: 'b' };

      const diff = calculateSimpleDiff(old, updated, ['secret']);

      expect(diff).toHaveLength(1);
      expect(diff?.[0].field).toBe('name');
    });
  });
});
