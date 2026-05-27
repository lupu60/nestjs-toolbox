import type { Repository } from 'typeorm';
import { vi } from 'vitest';
import { _chunkValues, _generateSetterString, _keys, TypeOrmUpsert, type UpsertResult } from '../typeorm-upsert';

interface TestEntity {
  id: number;
  name: string;
}

describe('Dummy Test', () => {
  const array = [
    { id: 1, name: 'foo' },
    { id: 2, name: 'bar' },
    { id: 3, name: 'foo' },
    { id: 4, name: 'bar' },
  ];
  const createMockQueryBuilder = (executeResult = { raw: [] }) => {
    const qb: Record<string, unknown> = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      getQuery: vi.fn().mockReturnValue(''),
      execute: vi.fn().mockResolvedValue(executeResult),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
    };
    // orUpdate, returning, etc. all return the same builder
    for (const method of ['insert', 'values', 'orUpdate', 'returning', 'select', 'where']) {
      (qb[method] as ReturnType<typeof vi.fn>).mockReturnValue(qb);
    }
    return qb;
  };

  const repository = {
    createQueryBuilder: vi.fn().mockReturnValue(createMockQueryBuilder()),
  } as unknown as Repository<TestEntity>;

  it('should be defined', () => {
    expect(TypeOrmUpsert).toBeDefined();
  });

  it('should generate setter string', () => {
    const keys = ['id', 'name'];
    const keyNamingTransform = (k: string) => k;
    const expectedStatement = 'id=EXCLUDED.id , name=EXCLUDED.name , "updatedAt"=CURRENT_TIMESTAMP';
    expect(_generateSetterString({ keys, keyNamingTransform })).toEqual(expectedStatement);
  });

  it('should generate setter string', () => {
    const keys = ['id', 'name', 'firstName'];
    const keyNamingTransform = (k: string) => k;
    const expectedStatement = 'id=EXCLUDED.id , name=EXCLUDED.name , "firstName"=EXCLUDED."firstName" , "updatedAt"=CURRENT_TIMESTAMP';
    expect(_generateSetterString({ keys, keyNamingTransform })).toEqual(expectedStatement);
  });

  it('should generate setter string with right key transform', () => {
    const keys = ['id', 'name', 'first_name'];
    const keyNamingTransform = (k: string) => k.toUpperCase();
    const expectedStatement = 'ID=EXCLUDED.id , NAME=EXCLUDED.name , FIRST_NAME=EXCLUDED.first_name , "updatedAt"=CURRENT_TIMESTAMP';
    expect(_generateSetterString({ keys, keyNamingTransform })).toEqual(expectedStatement);
  });

  it('should generate the right keys', () => {
    const data = { id: 1, name: '' };
    expect(_keys({ sampleObject: data, doNotUpsert: [] })).toEqual(['id', 'name']);
  });
  it('should generate the right keys', () => {
    const data = { id: 1, name: '', status: 'active' };
    expect(_keys({ sampleObject: data, doNotUpsert: ['status'] })).toEqual(['id', 'name']);
  });

  it('should chunk huge arrays', () => {
    const chunk = _chunkValues({ values: array, chunk: 2 });
    expect(chunk.length).toEqual(2);
  });

  it('should save', async () => {
    const data = [{ id: 1, name: '' }];
    const saved = await TypeOrmUpsert(repository, data, 'id');
    expect(saved).toBeDefined();
  });

  it('should save', async () => {
    const saved = await TypeOrmUpsert(repository, array, 'id', { chunk: 3 });
    expect(saved).toBeDefined();
  });

  describe('returnStatus option', () => {
    it('should return status when returnStatus is true', async () => {
      const qb = createMockQueryBuilder({
        raw: [
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' },
        ],
      });
      (qb.getRawMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]); // id: 1 exists, id: 2 doesn't
      const mockRepository = {
        createQueryBuilder: vi.fn().mockReturnValue(qb),
      } as unknown as Repository<TestEntity>;

      const data = [
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' },
      ];

      const result = await TypeOrmUpsert(mockRepository, data, 'id', { returnStatus: true });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as UpsertResult<TestEntity>[]).length).toBe(2);
      expect((result as UpsertResult<TestEntity>[])[0].status).toBe('updated');
      expect((result as UpsertResult<TestEntity>[])[0].entity.id).toBe(1);
      expect((result as UpsertResult<TestEntity>[])[1].status).toBe('inserted');
      expect((result as UpsertResult<TestEntity>[])[1].entity.id).toBe(2);
    });

    it('should return single result with status when object is not an array', async () => {
      const qb = createMockQueryBuilder({
        raw: [{ id: 1, name: 'foo' }],
      });
      (qb.getRawMany as ReturnType<typeof vi.fn>).mockResolvedValue([]); // doesn't exist, so it will be inserted
      const mockRepository = {
        createQueryBuilder: vi.fn().mockReturnValue(qb),
      } as unknown as Repository<TestEntity>;

      const data = { id: 1, name: 'foo' };
      const result = await TypeOrmUpsert(mockRepository, data, 'id', { returnStatus: true });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(false);
      expect((result as UpsertResult<TestEntity>).status).toBe('inserted');
      expect((result as UpsertResult<TestEntity>).entity.id).toBe(1);
    });

    it('should not return status when returnStatus is false (backward compatibility)', async () => {
      const mockRepository = {
        createQueryBuilder: vi.fn().mockReturnValue(
          createMockQueryBuilder({
            raw: [{ id: 1, name: 'foo' }],
          }),
        ),
      } as unknown as Repository<TestEntity>;

      const data = [{ id: 1, name: 'foo' }];
      const result = await TypeOrmUpsert(mockRepository, data, 'id', { returnStatus: false });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      const resultArray = result as Array<{ id: number; name: string }>;
      expect(resultArray[0]).not.toHaveProperty('status');
      expect(resultArray[0]).not.toHaveProperty('entity');
      expect(resultArray[0].id).toBe(1);
    });

    it('should not return status when returnStatus is not specified (backward compatibility)', async () => {
      const mockRepository = {
        createQueryBuilder: vi.fn().mockReturnValue(
          createMockQueryBuilder({
            raw: [{ id: 1, name: 'foo' }],
          }),
        ),
      } as unknown as Repository<TestEntity>;

      const data = [{ id: 1, name: 'foo' }];
      const result = await TypeOrmUpsert(mockRepository, data, 'id');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      const resultArray = result as Array<{ id: number; name: string }>;
      expect(resultArray[0]).not.toHaveProperty('status');
      expect(resultArray[0]).not.toHaveProperty('entity');
      expect(resultArray[0].id).toBe(1);
    });
  });
});
