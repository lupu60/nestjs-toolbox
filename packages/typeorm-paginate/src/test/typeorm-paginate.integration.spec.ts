import { DataSource, EntitySchema, type Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rows, set } from '../typeorm-paginate';

// Integration tests against a real in-memory SQLite database (sql.js)

interface Item {
  id: number;
  kind: string;
}

const ItemSchema = new EntitySchema<Item>({
  name: 'Item',
  columns: {
    id: { type: Number, primary: true, generated: true },
    kind: { type: String },
  },
});

describe('typeorm-paginate (sql.js integration)', () => {
  let dataSource: DataSource;
  let repository: Repository<Item>;

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqljs', synchronize: true, entities: [ItemSchema] });
    await dataSource.initialize();
    repository = dataSource.getRepository(ItemSchema);
    await repository.save([{ kind: 'a' }, { kind: 'a' }, { kind: 'a' }, { kind: 'b' }, { kind: 'b' }, { kind: 'c' }, { kind: 'c' }]);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('rows', () => {
    it('should support array where clauses as OR conditions (issue #891)', async () => {
      const results = [];
      for await (const row of rows({ repository, where: [{ kind: 'a' }, { kind: 'b' }], limit: 2 })) {
        results.push(row);
      }

      expect(results).toHaveLength(5);
      expect(results.every((row) => row.kind === 'a' || row.kind === 'b')).toBe(true);
      expect(new Set(results.map((row) => row.id)).size).toBe(5);
      expect(results.map((row) => row.index)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should report progress as rounded integers (issue #891)', async () => {
      const progress = [];
      for await (const row of rows({ repository, where: {}, limit: 3 })) {
        progress.push(row.progress);
      }

      expect(progress).toEqual([14, 29, 43, 57, 71, 86, 100]);
    });

    it('should filter with an object where clause', async () => {
      const results = [];
      for await (const row of rows({ repository, where: { kind: 'c' } })) {
        results.push(row);
      }

      expect(results).toHaveLength(2);
      expect(results.every((row) => row.kind === 'c')).toBe(true);
      expect(results[1].progress).toBe(100);
    });

    it('should start from the given offset', async () => {
      const results = [];
      for await (const row of rows({ repository, where: {}, limit: 10, offset: 5 })) {
        results.push(row);
      }

      expect(results).toHaveLength(2);
      expect(results.map((row) => row.kind)).toEqual(['c', 'c']);
    });

    it('should yield nothing when no rows match', async () => {
      const results = [];
      for await (const row of rows({ repository, where: { kind: 'z' } })) {
        results.push(row);
      }

      expect(results).toHaveLength(0);
    });

    it('should keep entity fields and add pagination metadata', async () => {
      const results = [];
      for await (const row of rows({ repository, where: { kind: 'b' }, limit: 1 })) {
        results.push(row);
      }

      expect(results[0]).toEqual({ id: expect.any(Number), kind: 'b', index: 1, progress: 50 });
      expect(results[1]).toEqual({ id: expect.any(Number), kind: 'b', index: 2, progress: 100 });
    });
  });

  describe('set', () => {
    it('should support array where clauses as OR conditions (issue #891)', async () => {
      const batches = [];
      for await (const batch of set({ repository, where: [{ kind: 'a' }, { kind: 'b' }], limit: 2 })) {
        batches.push(batch);
      }

      expect(batches.map((batch) => batch.length)).toEqual([2, 2, 1]);
      expect(batches.flat().every((row) => row.kind === 'a' || row.kind === 'b')).toBe(true);
    });

    it('should return every row exactly once across batches', async () => {
      const batches = [];
      for await (const batch of set({ repository, where: {}, limit: 3 })) {
        batches.push(batch);
      }

      expect(batches.map((batch) => batch.length)).toEqual([3, 3, 1]);
      expect(new Set(batches.flat().map((row) => row.id)).size).toBe(7);
    });

    it('should yield no batches when no rows match', async () => {
      const batches = [];
      for await (const batch of set({ repository, where: { kind: 'z' } })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(0);
    });
  });
});
