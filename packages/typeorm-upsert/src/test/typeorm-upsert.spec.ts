import { _generateSetterString, TypeOrmUpsert, _keys, _chunkValues, UpsertResult } from '../typeorm-upsert';

describe('Dummy Test', () => {
  const array = [
    { id: 1, name: 'foo' },
    { id: 2, name: 'bar' },
    { id: 3, name: 'foo' },
    { id: 4, name: 'bar' },
  ];
  const repository = jest.fn();
  // @ts-ignore
  repository.createQueryBuilder = jest.fn().mockReturnValue({
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflict: jest.fn().mockReturnValue({ returning: jest.fn().mockReturnValue({ execute: jest.fn().mockResolvedValue({ raw: [] }) }) }),
      }),
    }),
  });

  it('should be defined', () => {
    expect(TypeOrmUpsert).toBeDefined();
  });

  it('should generate setter string', () => {
    const keys = ['id', 'name'];
    const keyNamingTransform = (k) => k;
    const expectedStatement = 'id=EXCLUDED.id , name=EXCLUDED.name , "updatedAt"=CURRENT_TIMESTAMP';
    expect(_generateSetterString({ keys, keyNamingTransform })).toEqual(expectedStatement);
  });

  it('should generate setter string', () => {
    const keys = ['id', 'name', 'firstName'];
    const keyNamingTransform = (k) => k;
    const expectedStatement = 'id=EXCLUDED.id , name=EXCLUDED.name , "firstName"=EXCLUDED."firstName" , "updatedAt"=CURRENT_TIMESTAMP';
    expect(_generateSetterString({ keys, keyNamingTransform })).toEqual(expectedStatement);
  });

  it('should generate setter string with right key transform', () => {
    const keys = ['id', 'name', 'first_name'];
    const keyNamingTransform = (k) => k.toUpperCase();
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
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflict: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue({
                    raw: [
                      { id: 1, name: 'foo' },
                      { id: 2, name: 'bar' },
                    ],
                  }),
                }),
              }),
            }),
          }),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([{ id: 1 }]), // id: 1 exists, id: 2 doesn't
        }),
      };

      const data = [
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' },
      ];

      const result = await TypeOrmUpsert(mockRepository, data, 'id', { returnStatus: true });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as UpsertResult<any>[]).length).toBe(2);
      expect((result as UpsertResult<any>[])[0].status).toBe('updated');
      expect((result as UpsertResult<any>[])[0].entity.id).toBe(1);
      expect((result as UpsertResult<any>[])[1].status).toBe('inserted');
      expect((result as UpsertResult<any>[])[1].entity.id).toBe(2);
    });

    it('should return single result with status when object is not an array', async () => {
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflict: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue({
                    raw: [{ id: 1, name: 'foo' }],
                  }),
                }),
              }),
            }),
          }),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]), // doesn't exist, so it will be inserted
        }),
      };

      const data = { id: 1, name: 'foo' };
      const result = await TypeOrmUpsert(mockRepository, data, 'id', { returnStatus: true });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(false);
      expect((result as UpsertResult<any>).status).toBe('inserted');
      expect((result as UpsertResult<any>).entity.id).toBe(1);
    });

    it('should not return status when returnStatus is false (backward compatibility)', async () => {
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflict: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue({
                    raw: [{ id: 1, name: 'foo' }],
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const data = [{ id: 1, name: 'foo' }];
      const result = await TypeOrmUpsert(mockRepository, data, 'id', { returnStatus: false });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).not.toHaveProperty('status');
      expect(result[0]).not.toHaveProperty('entity');
      expect(result[0].id).toBe(1);
    });

    it('should not return status when returnStatus is not specified (backward compatibility)', async () => {
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              onConflict: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue({
                    raw: [{ id: 1, name: 'foo' }],
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const data = [{ id: 1, name: 'foo' }];
      const result = await TypeOrmUpsert(mockRepository, data, 'id');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).not.toHaveProperty('status');
      expect(result[0]).not.toHaveProperty('entity');
      expect(result[0].id).toBe(1);
    });
  });
});
