import { getSoftDeleteConfig, isSoftDeletable, SoftDeletable } from '../decorators';

@SoftDeletable()
class TestEntity {
  id!: number;
  name!: string;
  deletedAt?: Date;
}

@SoftDeletable({ columnName: 'deleted_at', allowHardDelete: true })
class CustomEntity {
  id!: number;
  name!: string;
  deleted_at?: Date;
}

class NonDeletableEntity {
  id!: number;
  name!: string;
}

describe('SoftDeletable decorator', () => {
  it('should mark entity as soft-deletable', () => {
    expect(isSoftDeletable(TestEntity)).toBe(true);
  });

  it('should store default configuration', () => {
    const config = getSoftDeleteConfig(TestEntity);

    expect(config).toBeDefined();
    expect(config?.columnName).toBe('deletedAt');
    expect(config?.allowHardDelete).toBe(false);
  });

  it('should store custom configuration', () => {
    const config = getSoftDeleteConfig(CustomEntity);

    expect(config).toBeDefined();
    expect(config?.columnName).toBe('deleted_at');
    expect(config?.allowHardDelete).toBe(true);
  });

  it('should return false for non-decorated entity', () => {
    expect(isSoftDeletable(NonDeletableEntity)).toBe(false);
  });

  it('should return undefined config for non-decorated entity', () => {
    const config = getSoftDeleteConfig(NonDeletableEntity);

    expect(config).toBeUndefined();
  });
});
