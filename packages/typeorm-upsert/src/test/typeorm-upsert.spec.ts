import { _generateSetterString, TypeOrmUpsert, _keys, _chunkValues } from '../typeorm-upsert';

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
});
