import type { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rows, set } from '../typeorm-paginate';

interface TestEntity extends ObjectLiteral {
  id: number;
  name: string;
}

describe('typeorm-paginate', () => {
  describe('rows', () => {
    let mockRepository: Repository<TestEntity>;
    const mockData: TestEntity[] = [
      { id: 1, name: 'Entity 1' },
      { id: 2, name: 'Entity 2' },
      { id: 3, name: 'Entity 3' },
      { id: 4, name: 'Entity 4' },
      { id: 5, name: 'Entity 5' },
    ];

    beforeEach(() => {
      mockRepository = {
        count: vi.fn(),
        find: vi.fn(),
      } as unknown as Repository<TestEntity>;
    });

    it('should yield rows with pagination metadata', async () => {
      const where: FindOptionsWhere<TestEntity> = { id: 1 };
      vi.spyOn(mockRepository, 'count').mockResolvedValue(3);
      vi.spyOn(mockRepository, 'find').mockResolvedValueOnce([mockData[0], mockData[1]]).mockResolvedValueOnce([mockData[2]]);

      const results = [];
      for await (const row of rows({ repository: mockRepository, where, limit: 2 })) {
        results.push(row);
      }

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        id: 1,
        name: 'Entity 1',
        index: 1,
        progress: expect.any(Number),
      });
      expect(results[2].index).toBe(3);
      expect(results[2].progress).toBe(100);
    });

    it('should use default limit when not provided', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find').mockResolvedValue(mockData);

      const results = [];
      for await (const row of rows({ repository: mockRepository, where })) {
        results.push(row);
      }

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 100, // DEFAULT_PAGINATION_LIMIT
      });
    });

    it('should calculate progress correctly', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find').mockResolvedValue(mockData);

      const results = [];
      for await (const row of rows({ repository: mockRepository, where, limit: 10 })) {
        results.push(row);
      }

      expect(results[0].progress).toBe(20); // 1/5 = 0.20 * 100
      expect(results[1].progress).toBe(40); // 2/5 = 0.40 * 100
      expect(results[4].progress).toBe(100); // last one
    });

    it('should handle custom offset', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find').mockResolvedValue([mockData[2], mockData[3], mockData[4]]);

      const results = [];
      for await (const row of rows({ repository: mockRepository, where, limit: 10, offset: 2 })) {
        results.push(row);
      }

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        skip: 2,
        take: 10,
      });
      expect(results[0].index).toBe(1);
    });

    it('should handle empty results', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(0);
      vi.spyOn(mockRepository, 'find').mockResolvedValue([]);

      const results = [];
      for await (const row of rows({ repository: mockRepository, where })) {
        results.push(row);
      }

      expect(results).toHaveLength(0);
    });

    it('should handle multiple pages correctly', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find')
        .mockResolvedValueOnce([mockData[0], mockData[1]])
        .mockResolvedValueOnce([mockData[2], mockData[3]])
        .mockResolvedValueOnce([mockData[4]]);

      const results = [];
      for await (const row of rows({ repository: mockRepository, where, limit: 2 })) {
        results.push(row);
      }

      expect(mockRepository.find).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(5);
    });
  });

  describe('set', () => {
    let mockRepository: Repository<TestEntity>;
    const mockData: TestEntity[] = [
      { id: 1, name: 'Entity 1' },
      { id: 2, name: 'Entity 2' },
      { id: 3, name: 'Entity 3' },
      { id: 4, name: 'Entity 4' },
      { id: 5, name: 'Entity 5' },
    ];

    beforeEach(() => {
      mockRepository = {
        count: vi.fn(),
        find: vi.fn(),
      } as unknown as Repository<TestEntity>;
    });

    it('should yield sets of rows', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find')
        .mockResolvedValueOnce([mockData[0], mockData[1]])
        .mockResolvedValueOnce([mockData[2], mockData[3]])
        .mockResolvedValueOnce([mockData[4]]);

      const results = [];
      for await (const rowSet of set({ repository: mockRepository, where, limit: 2 })) {
        results.push(rowSet);
      }

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(2);
      expect(results[2]).toHaveLength(1);
    });

    it('should use default limit when not provided', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find').mockResolvedValue(mockData);

      const results = [];
      for await (const rowSet of set({ repository: mockRepository, where })) {
        results.push(rowSet);
      }

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 100, // DEFAULT_PAGINATION_LIMIT
      });
    });

    it('should handle empty results', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(0);
      vi.spyOn(mockRepository, 'find').mockResolvedValue([]);

      const results = [];
      for await (const rowSet of set({ repository: mockRepository, where })) {
        results.push(rowSet);
      }

      expect(results).toHaveLength(0);
    });

    it('should paginate correctly with custom limit', async () => {
      const where: FindOptionsWhere<TestEntity> = {};
      vi.spyOn(mockRepository, 'count').mockResolvedValue(5);
      vi.spyOn(mockRepository, 'find')
        .mockResolvedValueOnce([mockData[0], mockData[1], mockData[2]])
        .mockResolvedValueOnce([mockData[3], mockData[4]]);

      const results = [];
      for await (const rowSet of set({ repository: mockRepository, where, limit: 3 })) {
        results.push(rowSet);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual([mockData[0], mockData[1], mockData[2]]);
      expect(results[1]).toEqual([mockData[3], mockData[4]]);
    });

    it('should handle array of where conditions', async () => {
      const where: FindOptionsWhere<TestEntity>[] = [{ id: 1 }, { id: 2 }];
      vi.spyOn(mockRepository, 'count').mockResolvedValue(2);
      vi.spyOn(mockRepository, 'find').mockResolvedValue([mockData[0], mockData[1]]);

      const results = [];
      for await (const rowSet of set({ repository: mockRepository, where })) {
        results.push(rowSet);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(2);
    });
  });
});
