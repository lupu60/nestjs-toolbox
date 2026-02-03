import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import { rowsOnlyDeleted, rowsWithDeleted } from '../soft-delete-paginate';

interface TestEntity {
  id: number;
  name: string;
  deletedAt?: Date | null;
}

const createMockRepository = (entities: TestEntity[] = []): Repository<TestEntity> => {
  return {
    metadata: {
      name: 'TestEntity',
      deleteDateColumn: {
        databaseName: 'deletedAt',
        propertyName: 'deletedAt',
      },
      primaryColumns: [{ propertyName: 'id' }],
    },
    count: vi.fn().mockResolvedValue(entities.length),
    find: vi.fn().mockResolvedValue(entities),
  } as unknown as Repository<TestEntity>;
};

describe('rowsWithDeleted', () => {
  it('should paginate entities excluding deleted by default', async () => {
    const entities = [
      { id: 1, name: 'user1', deletedAt: null },
      { id: 2, name: 'user2', deletedAt: null },
    ];
    const mockRepo = createMockRepository(entities);

    const results: TestEntity[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
    })) {
      results.push(row.data);
    }

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('user1');
    expect(results[1].name).toBe('user2');
  });

  it('should include progress metadata', async () => {
    const entities = [
      { id: 1, name: 'user1', deletedAt: null },
      { id: 2, name: 'user2', deletedAt: null },
    ];
    const mockRepo = createMockRepository(entities);

    const progressValues: number[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
    })) {
      progressValues.push(row.progress);
    }

    expect(progressValues).toEqual([0.5, 1]);
  });

  it('should include index metadata', async () => {
    const entities = [
      { id: 1, name: 'user1', deletedAt: null },
      { id: 2, name: 'user2', deletedAt: null },
    ];
    const mockRepo = createMockRepository(entities);

    const indices: number[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
    })) {
      indices.push(row.index);
    }

    expect(indices).toEqual([0, 1]);
  });

  it('should respect custom limit', async () => {
    const entities = [{ id: 1, name: 'user1', deletedAt: null }];
    const mockRepo = createMockRepository(entities);

    const results: TestEntity[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
      limit: 50,
    })) {
      results.push(row.data);
    }

    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      }),
    );
  });

  it('should respect offset', async () => {
    // Create more entities than the offset to ensure pagination runs
    const entities = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `user${i + 1}`,
      deletedAt: null,
    }));
    const mockRepo = createMockRepository(entities);

    const results: TestEntity[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
      offset: 10,
      limit: 100,
    })) {
      results.push(row.data);
    }

    // Should have been called with skip: 10
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
      }),
    );
    expect(results).toHaveLength(15);
  });

  it('should include deleted when includeDeleted is true', async () => {
    const entities = [
      { id: 1, name: 'user1', deletedAt: null },
      { id: 2, name: 'user2', deletedAt: new Date() },
    ];
    const mockRepo = createMockRepository(entities);

    const results: TestEntity[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
      includeDeleted: true,
    })) {
      results.push(row.data);
    }

    expect(results).toHaveLength(2);
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        withDeleted: true,
      }),
    );
  });

  it('should handle empty results', async () => {
    const mockRepo = createMockRepository([]);

    const results: TestEntity[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
    })) {
      results.push(row.data);
    }

    expect(results).toHaveLength(0);
  });

  it('should handle progress when total is 0', async () => {
    const mockRepo = createMockRepository([]);

    const progressValues: number[] = [];
    for await (const row of rowsWithDeleted({
      repository: mockRepo,
      where: {},
    })) {
      progressValues.push(row.progress);
    }

    expect(progressValues).toHaveLength(0);
  });
});

describe('rowsOnlyDeleted', () => {
  it('should paginate only deleted entities', async () => {
    const entities = [{ id: 1, name: 'deleted', deletedAt: new Date() }];
    const mockRepo = createMockRepository(entities);

    const results: TestEntity[] = [];
    for await (const row of rowsOnlyDeleted({
      repository: mockRepo,
      where: {},
    })) {
      results.push(row.data);
    }

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('deleted');
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        withDeleted: true,
      }),
    );
  });

  it('should include progress and index metadata', async () => {
    const entities = [
      { id: 1, name: 'deleted1', deletedAt: new Date() },
      { id: 2, name: 'deleted2', deletedAt: new Date() },
    ];
    const mockRepo = createMockRepository(entities);

    const rows: Array<{ index: number; progress: number }> = [];
    for await (const row of rowsOnlyDeleted({
      repository: mockRepo,
      where: {},
    })) {
      rows.push({ index: row.index, progress: row.progress });
    }

    expect(rows).toEqual([
      { index: 0, progress: 0.5 },
      { index: 1, progress: 1 },
    ]);
  });

  it('should throw error if entity lacks @DeleteDateColumn', async () => {
    const mockRepo = {
      metadata: {
        name: 'TestEntity',
        deleteDateColumn: undefined,
        primaryColumns: [{ propertyName: 'id' }],
      },
    } as unknown as Repository<TestEntity>;

    const generator = rowsOnlyDeleted({
      repository: mockRepo,
      where: {},
    });

    await expect(generator.next()).rejects.toThrow('does not have @DeleteDateColumn');
  });

  it('should respect custom limit', async () => {
    const entities = [{ id: 1, name: 'deleted', deletedAt: new Date() }];
    const mockRepo = createMockRepository(entities);

    for await (const _ of rowsOnlyDeleted({
      repository: mockRepo,
      where: {},
      limit: 25,
    })) {
      // Iterate
    }

    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
      }),
    );
  });
});
