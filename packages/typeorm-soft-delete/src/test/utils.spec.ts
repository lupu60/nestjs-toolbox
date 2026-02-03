import type { Repository } from 'typeorm';
import { getDeleteDateColumnName, getPrimaryColumns, supportsSoftDelete, validateSoftDeleteSupport } from '../utils';

interface TestEntity {
  id: number;
  name: string;
  deletedAt?: Date;
}

const createMockRepository = (hasDeleteColumn = true, deleteColumnName = 'deletedAt'): Repository<TestEntity> => {
  return {
    metadata: {
      name: 'TestEntity',
      deleteDateColumn: hasDeleteColumn
        ? {
            databaseName: deleteColumnName,
            propertyName: deleteColumnName,
          }
        : undefined,
      primaryColumns: [{ propertyName: 'id' }],
    },
  } as unknown as Repository<TestEntity>;
};

describe('validateSoftDeleteSupport', () => {
  it('should not throw for entity with @DeleteDateColumn', () => {
    const mockRepo = createMockRepository(true);

    expect(() => validateSoftDeleteSupport(mockRepo)).not.toThrow();
  });

  it('should throw error for entity without @DeleteDateColumn', () => {
    const mockRepo = createMockRepository(false);

    expect(() => validateSoftDeleteSupport(mockRepo)).toThrow('does not have @DeleteDateColumn');
    expect(() => validateSoftDeleteSupport(mockRepo)).toThrow('TestEntity');
  });
});

describe('getDeleteDateColumnName', () => {
  it('should return delete date column name', () => {
    const mockRepo = createMockRepository(true, 'deletedAt');

    const columnName = getDeleteDateColumnName(mockRepo);

    expect(columnName).toBe('deletedAt');
  });

  it('should return custom column name', () => {
    const mockRepo = createMockRepository(true, 'deleted_at');

    const columnName = getDeleteDateColumnName(mockRepo);

    expect(columnName).toBe('deleted_at');
  });

  it('should throw error if entity lacks @DeleteDateColumn', () => {
    const mockRepo = createMockRepository(false);

    expect(() => getDeleteDateColumnName(mockRepo)).toThrow('does not have @DeleteDateColumn');
  });
});

describe('supportsSoftDelete', () => {
  it('should return true for entity with @DeleteDateColumn', () => {
    const mockRepo = createMockRepository(true);

    expect(supportsSoftDelete(mockRepo)).toBe(true);
  });

  it('should return false for entity without @DeleteDateColumn', () => {
    const mockRepo = createMockRepository(false);

    expect(supportsSoftDelete(mockRepo)).toBe(false);
  });
});

describe('getPrimaryColumns', () => {
  it('should return primary column names', () => {
    const mockRepo = createMockRepository(true);

    const columns = getPrimaryColumns(mockRepo);

    expect(columns).toEqual(['id']);
  });

  it('should handle multiple primary columns', () => {
    const mockRepo = {
      metadata: {
        primaryColumns: [{ propertyName: 'id' }, { propertyName: 'tenantId' }],
      },
    } as unknown as Repository<TestEntity>;

    const columns = getPrimaryColumns(mockRepo);

    expect(columns).toEqual(['id', 'tenantId']);
  });
});
