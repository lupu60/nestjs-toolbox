import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import { count, findOnlyDeleted, findWithDeleted, forceDelete, isSoftDeleted, restore, softDelete } from '../soft-delete-operations';

interface TestEntity {
  id: number;
  name: string;
  deletedAt?: Date;
}

const createMockRepository = (overrides?: Partial<Repository<TestEntity>>): Repository<TestEntity> => {
  const queryBuilder = {
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ affected: 1 }),
  };

  return {
    metadata: {
      name: 'TestEntity',
      deleteDateColumn: {
        databaseName: 'deletedAt',
        propertyName: 'deletedAt',
      },
      primaryColumns: [{ propertyName: 'id' }],
    },
    createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as Repository<TestEntity>;
};

describe('softDelete', () => {
  it('should soft delete by single ID', async () => {
    const mockRepo = createMockRepository();
    const result = await softDelete(mockRepo, 123);

    expect(result.affected).toBe(1);
    expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('should soft delete by array of IDs', async () => {
    const mockRepo = createMockRepository();
    const qb = mockRepo.createQueryBuilder();
    vi.mocked(qb.execute).mockResolvedValue({ affected: 3 });

    const result = await softDelete(mockRepo, [1, 2, 3]);

    expect(result.affected).toBe(3);
    expect(qb.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: [1, 2, 3] });
  });

  it('should soft delete by where clause', async () => {
    const mockRepo = createMockRepository();
    const result = await softDelete(mockRepo, { name: 'test' });

    expect(result.affected).toBe(1);
    const qb = mockRepo.createQueryBuilder();
    expect(qb.where).toHaveBeenCalledWith({ name: 'test' });
  });

  it('should throw error if validateExists is true and no records affected', async () => {
    const mockRepo = createMockRepository();
    const qb = mockRepo.createQueryBuilder();
    vi.mocked(qb.execute).mockResolvedValue({ affected: 0 });

    await expect(softDelete(mockRepo, 999, { validateExists: true })).rejects.toThrow('Entity not found or already deleted');
  });

  it('should throw error if entity lacks @DeleteDateColumn', async () => {
    const mockRepo = createMockRepository({
      metadata: {
        name: 'TestEntity',
        deleteDateColumn: undefined,
        primaryColumns: [{ propertyName: 'id' }],
        // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any
      } as any,
    });

    await expect(softDelete(mockRepo, 1)).rejects.toThrow('does not have @DeleteDateColumn');
  });

  it('should set deletedAt to CURRENT_TIMESTAMP', async () => {
    const mockRepo = createMockRepository();
    await softDelete(mockRepo, 1);

    const qb = mockRepo.createQueryBuilder();
    expect(qb.set).toHaveBeenCalledWith({ deletedAt: expect.any(Function) });
    expect(qb.andWhere).toHaveBeenCalledWith('deletedAt IS NULL');
  });
});

describe('restore', () => {
  it('should restore by single ID', async () => {
    const mockRepo = createMockRepository();
    const result = await restore(mockRepo, 123);

    expect(result.affected).toBe(1);
    expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('should restore by array of IDs', async () => {
    const mockRepo = createMockRepository();
    const qb = mockRepo.createQueryBuilder();
    vi.mocked(qb.execute).mockResolvedValue({ affected: 2 });

    const result = await restore(mockRepo, [1, 2]);

    expect(result.affected).toBe(2);
  });

  it('should throw error if validateExists is true and no records affected', async () => {
    const mockRepo = createMockRepository();
    const qb = mockRepo.createQueryBuilder();
    vi.mocked(qb.execute).mockResolvedValue({ affected: 0 });

    await expect(restore(mockRepo, 999, { validateExists: true })).rejects.toThrow('Entity not found or not soft-deleted');
  });

  it('should set deletedAt to null', async () => {
    const mockRepo = createMockRepository();
    await restore(mockRepo, 1);

    const qb = mockRepo.createQueryBuilder();
    expect(qb.set).toHaveBeenCalledWith({ deletedAt: null });
    expect(qb.andWhere).toHaveBeenCalledWith('deletedAt IS NOT NULL');
  });
});

describe('forceDelete', () => {
  it('should permanently delete soft-deleted record', async () => {
    const mockRepo = createMockRepository();
    const result = await forceDelete(mockRepo, 123);

    expect(result.affected).toBe(1);
    const qb = mockRepo.createQueryBuilder();
    expect(qb.delete).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith('deletedAt IS NOT NULL');
  });

  it('should handle array of IDs', async () => {
    const mockRepo = createMockRepository();
    const qb = mockRepo.createQueryBuilder();
    vi.mocked(qb.execute).mockResolvedValue({ affected: 3 });

    const result = await forceDelete(mockRepo, [1, 2, 3]);

    expect(result.affected).toBe(3);
  });

  it('should only delete records that are already soft-deleted', async () => {
    const mockRepo = createMockRepository();
    await forceDelete(mockRepo, 1);

    const qb = mockRepo.createQueryBuilder();
    expect(qb.andWhere).toHaveBeenCalledWith('deletedAt IS NOT NULL');
  });
});

describe('findWithDeleted', () => {
  it('should find entities including deleted ones', async () => {
    const mockEntities = [
      { id: 1, name: 'active', deletedAt: null },
      { id: 2, name: 'deleted', deletedAt: new Date() },
    ];
    const mockRepo = createMockRepository({
      find: vi.fn().mockResolvedValue(mockEntities),
    });

    const result = await findWithDeleted(mockRepo);

    expect(result).toEqual(mockEntities);
    expect(mockRepo.find).toHaveBeenCalledWith({
      withDeleted: true,
    });
  });

  it('should pass through find options', async () => {
    const mockRepo = createMockRepository();
    await findWithDeleted(mockRepo, { where: { name: 'test' }, take: 10 });

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { name: 'test' },
      take: 10,
      withDeleted: true,
    });
  });
});

describe('findOnlyDeleted', () => {
  it('should find only soft-deleted entities', async () => {
    const deletedEntity = { id: 1, name: 'deleted', deletedAt: new Date() };
    const mockRepo = createMockRepository({
      find: vi.fn().mockResolvedValue([deletedEntity]),
    });

    const result = await findOnlyDeleted(mockRepo);

    expect(result).toEqual([deletedEntity]);
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        withDeleted: true,
      }),
    );
  });

  it('should throw error if entity lacks @DeleteDateColumn', async () => {
    const mockRepo = createMockRepository({
      metadata: {
        name: 'TestEntity',
        deleteDateColumn: undefined,
        primaryColumns: [{ propertyName: 'id' }],
        // biome-ignore lint/suspicious/noExplicitAny: Test mock requires any
      } as any,
    });

    await expect(findOnlyDeleted(mockRepo)).rejects.toThrow('does not have @DeleteDateColumn');
  });
});

describe('count', () => {
  it('should count active entities by default', async () => {
    const mockRepo = createMockRepository({
      count: vi.fn().mockResolvedValue(5),
    });

    const result = await count(mockRepo);

    expect(result).toBe(5);
    expect(mockRepo.count).toHaveBeenCalledWith({
      withDeleted: undefined,
    });
  });

  it('should count including deleted when includeDeleted is true', async () => {
    const mockRepo = createMockRepository({
      count: vi.fn().mockResolvedValue(10),
    });

    const result = await count(mockRepo, { includeDeleted: true });

    expect(result).toBe(10);
    expect(mockRepo.count).toHaveBeenCalledWith({
      withDeleted: true,
    });
  });

  it('should pass through other count options', async () => {
    const mockRepo = createMockRepository();
    await count(mockRepo, { where: { name: 'test' }, includeDeleted: false });

    expect(mockRepo.count).toHaveBeenCalledWith({
      where: { name: 'test' },
      withDeleted: false,
    });
  });
});

describe('isSoftDeleted', () => {
  it('should return true for soft-deleted entity', async () => {
    const deletedEntity = { id: 1, name: 'test', deletedAt: new Date() };
    const mockRepo = createMockRepository({
      findOne: vi.fn().mockResolvedValue(deletedEntity),
    });

    const result = await isSoftDeleted(mockRepo, 1);

    expect(result).toBe(true);
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      withDeleted: true,
    });
  });

  it('should return false for active entity', async () => {
    const activeEntity = { id: 1, name: 'test', deletedAt: null };
    const mockRepo = createMockRepository({
      findOne: vi.fn().mockResolvedValue(activeEntity),
    });

    const result = await isSoftDeleted(mockRepo, 1);

    expect(result).toBe(false);
  });

  it('should throw error if entity not found', async () => {
    const mockRepo = createMockRepository({
      findOne: vi.fn().mockResolvedValue(null),
    });

    await expect(isSoftDeleted(mockRepo, 999)).rejects.toThrow('Entity not found');
  });
});
