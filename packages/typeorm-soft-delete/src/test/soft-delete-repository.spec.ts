import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import * as operations from '../soft-delete-operations';
import { SoftDeleteRepository, withSoftDelete } from '../soft-delete-repository';

interface TestEntity {
  id: number;
  name: string;
  deletedAt?: Date;
}

const createMockRepository = (): Repository<TestEntity> => {
  return {
    metadata: {
      name: 'TestEntity',
      deleteDateColumn: {
        databaseName: 'deletedAt',
        propertyName: 'deletedAt',
      },
      primaryColumns: [{ propertyName: 'id' }],
    },
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  } as unknown as Repository<TestEntity>;
};

describe('SoftDeleteRepository', () => {
  it('should delegate softDelete to core function', async () => {
    const mockRepo = createMockRepository();
    const softDeleteSpy = vi.spyOn(operations, 'softDelete').mockResolvedValue({ affected: 1 });

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.softDelete(123);

    expect(result.affected).toBe(1);
    expect(softDeleteSpy).toHaveBeenCalledWith(mockRepo, 123, undefined);
  });

  it('should delegate restore to core function', async () => {
    const mockRepo = createMockRepository();
    const restoreSpy = vi.spyOn(operations, 'restore').mockResolvedValue({ affected: 1 });

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.restore(123);

    expect(result.affected).toBe(1);
    expect(restoreSpy).toHaveBeenCalledWith(mockRepo, 123, undefined);
  });

  it('should delegate forceDelete to core function', async () => {
    const mockRepo = createMockRepository();
    const forceDeleteSpy = vi.spyOn(operations, 'forceDelete').mockResolvedValue({ affected: 1 });

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.forceDelete(123);

    expect(result.affected).toBe(1);
    expect(forceDeleteSpy).toHaveBeenCalledWith(mockRepo, 123);
  });

  it('should delegate findWithDeleted to core function', async () => {
    const mockRepo = createMockRepository();
    const mockEntities = [{ id: 1, name: 'test', deletedAt: null }];
    const findWithDeletedSpy = vi.spyOn(operations, 'findWithDeleted').mockResolvedValue(mockEntities);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.findWithDeleted();

    expect(result).toEqual(mockEntities);
    expect(findWithDeletedSpy).toHaveBeenCalledWith(mockRepo, undefined);
  });

  it('should delegate findOnlyDeleted to core function', async () => {
    const mockRepo = createMockRepository();
    const mockEntities = [{ id: 1, name: 'test', deletedAt: new Date() }];
    const findOnlyDeletedSpy = vi.spyOn(operations, 'findOnlyDeleted').mockResolvedValue(mockEntities);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.findOnlyDeleted();

    expect(result).toEqual(mockEntities);
    expect(findOnlyDeletedSpy).toHaveBeenCalledWith(mockRepo, undefined);
  });

  it('should delegate count to core function', async () => {
    const mockRepo = createMockRepository();
    const countSpy = vi.spyOn(operations, 'count').mockResolvedValue(5);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.count();

    expect(result).toBe(5);
    expect(countSpy).toHaveBeenCalledWith(mockRepo, undefined);
  });

  it('should delegate isSoftDeleted to core function', async () => {
    const mockRepo = createMockRepository();
    const isSoftDeletedSpy = vi.spyOn(operations, 'isSoftDeleted').mockResolvedValue(true);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.isSoftDeleted(123);

    expect(result).toBe(true);
    expect(isSoftDeletedSpy).toHaveBeenCalledWith(mockRepo, 123);
  });

  it('should delegate find to underlying repository', async () => {
    const mockRepo = createMockRepository();
    const mockEntities = [{ id: 1, name: 'test', deletedAt: null }];
    vi.mocked(mockRepo.find).mockResolvedValue(mockEntities);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.find({ where: { name: 'test' } });

    expect(result).toEqual(mockEntities);
    expect(mockRepo.find).toHaveBeenCalledWith({ where: { name: 'test' } });
  });

  it('should delegate findOne to underlying repository', async () => {
    const mockRepo = createMockRepository();
    const mockEntity = { id: 1, name: 'test', deletedAt: null };
    vi.mocked(mockRepo.findOne).mockResolvedValue(mockEntity);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.findOne({ where: { id: 1 } });

    expect(result).toEqual(mockEntity);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should delegate save to underlying repository', async () => {
    const mockRepo = createMockRepository();
    const entity = { id: 1, name: 'test', deletedAt: null };
    vi.mocked(mockRepo.save).mockResolvedValue(entity);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.save(entity);

    expect(result).toEqual(entity);
    expect(mockRepo.save).toHaveBeenCalledWith(entity);
  });

  it('should delegate remove to underlying repository', async () => {
    const mockRepo = createMockRepository();
    const entity = { id: 1, name: 'test', deletedAt: null };
    vi.mocked(mockRepo.remove).mockResolvedValue(entity);

    const wrapper = new SoftDeleteRepository(mockRepo);
    const result = await wrapper.remove(entity);

    expect(result).toEqual(entity);
    expect(mockRepo.remove).toHaveBeenCalledWith(entity);
  });
});

describe('withSoftDelete', () => {
  it('should create SoftDeleteRepository instance', () => {
    const mockRepo = createMockRepository();

    const wrapper = withSoftDelete(mockRepo);

    expect(wrapper).toBeInstanceOf(SoftDeleteRepository);
  });

  it('should create functional wrapper', async () => {
    const mockRepo = createMockRepository();
    const softDeleteSpy = vi.spyOn(operations, 'softDelete').mockResolvedValue({ affected: 1 });

    const wrapper = withSoftDelete(mockRepo);
    await wrapper.softDelete(123);

    expect(softDeleteSpy).toHaveBeenCalledWith(mockRepo, 123, undefined);
  });
});
