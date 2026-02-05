import { success, error, paginated } from '../helpers';
import { DEFAULT_MESSAGE } from '../constants';

describe('helpers', () => {
  describe('success()', () => {
    it('returns correct shape with defaults', () => {
      const result = success({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      expect(result.message).toBe(DEFAULT_MESSAGE);
      expect(result.meta.statusCode).toBe(200);
      expect(result.meta.path).toBe('');
      expect(result.meta.timestamp).toBeTruthy();
      expect(result.meta.pagination).toBeUndefined();
    });

    it('respects custom message, path, and statusCode', () => {
      const result = success('data', {
        message: 'Created',
        path: '/api/items',
        statusCode: 201,
      });

      expect(result.message).toBe('Created');
      expect(result.meta.path).toBe('/api/items');
      expect(result.meta.statusCode).toBe(201);
    });

    it('includes pagination when provided', () => {
      const pagination = { page: 2, limit: 10, total: 50, totalPages: 5 };
      const result = success([1, 2, 3], { pagination });

      expect(result.meta.pagination).toEqual(pagination);
    });

    it('wraps null data correctly', () => {
      const result = success(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('wraps undefined data correctly', () => {
      const result = success(undefined);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('error()', () => {
    it('returns correct shape with defaults', () => {
      const result = error('Something went wrong');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Something went wrong');
      expect(result.errors).toEqual([]);
      expect(result.meta.statusCode).toBe(500);
      expect(result.meta.path).toBe('');
      expect(result.meta.timestamp).toBeTruthy();
    });

    it('includes field errors when provided', () => {
      const fieldErrors = [
        { field: 'email', message: 'must be a valid email' },
        { field: 'name', message: 'should not be empty' },
      ];
      const result = error('Validation failed', {
        errors: fieldErrors,
        statusCode: 400,
      });

      expect(result.errors).toEqual(fieldErrors);
      expect(result.meta.statusCode).toBe(400);
    });

    it('defaults statusCode to 500', () => {
      const result = error('fail');

      expect(result.meta.statusCode).toBe(500);
    });

    it('respects custom path', () => {
      const result = error('not found', { path: '/api/users/99' });

      expect(result.meta.path).toBe('/api/users/99');
    });
  });

  describe('paginated()', () => {
    it('calculates totalPages correctly', () => {
      const result = paginated([1, 2, 3], { page: 1, limit: 10, total: 25 });

      expect(result.meta.pagination).toBeDefined();
      expect(result.meta.pagination!.totalPages).toBe(3); // ceil(25/10)
      expect(result.meta.pagination!.page).toBe(1);
      expect(result.meta.pagination!.limit).toBe(10);
      expect(result.meta.pagination!.total).toBe(25);
    });

    it('handles zero total', () => {
      const result = paginated([], { page: 1, limit: 10, total: 0 });

      expect(result.meta.pagination!.totalPages).toBe(0);
      expect(result.meta.pagination!.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('handles limit of 0 (edge case)', () => {
      const result = paginated([], { page: 1, limit: 0, total: 50 });

      expect(result.meta.pagination!.totalPages).toBe(0);
    });

    it('wraps data in success envelope', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = paginated(items, { page: 1, limit: 10, total: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(items);
      expect(result.message).toBe(DEFAULT_MESSAGE);
    });

    it('respects optional message, path, statusCode', () => {
      const result = paginated([1], { page: 1, limit: 5, total: 1 }, {
        message: 'Found',
        path: '/api/items',
        statusCode: 200,
      });

      expect(result.message).toBe('Found');
      expect(result.meta.path).toBe('/api/items');
      expect(result.meta.statusCode).toBe(200);
    });
  });
});
