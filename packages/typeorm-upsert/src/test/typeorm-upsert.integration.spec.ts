import { type DataSource, EntitySchema, type Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postgres, TEST_PG_URL } from '../../../../test/databases';
import { TypeOrmUpsert, type UpsertResult } from '../typeorm-upsert';

// Integration tests against a real PostgreSQL database, skipped when TEST_PG_URL is not set.
// sql.js is not an option here: TypeORM's SQLite drivers do not support RETURNING.

interface Product {
  sku: string;
  name: string;
  price: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Account {
  id: number;
  externalId: string;
  display_name: string;
  updatedAt: Date;
}

const ProductSchema = new EntitySchema<Product>({
  name: 'Product',
  columns: {
    sku: { type: 'varchar', primary: true },
    name: { type: 'varchar' },
    price: { type: 'int' },
    createdBy: { type: 'varchar', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});

// Mixes a camelCase and a snake_case column to exercise the quoted/unquoted setter paths
const AccountSchema = new EntitySchema<Account>({
  name: 'Account',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    externalId: { type: 'varchar', unique: true },
    display_name: { type: 'varchar' },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});

const product = (sku: string, overrides: Partial<Product> = {}) => ({ sku, name: `name-${sku}`, price: 10, ...overrides }) as Product;

describe.skipIf(!TEST_PG_URL)('typeorm-upsert (postgres integration)', () => {
  let dataSource: DataSource;
  let products: Repository<Product>;

  beforeEach(async () => {
    dataSource = await postgres('typeorm_upsert').initialize([ProductSchema, AccountSchema]);
    products = dataSource.getRepository(ProductSchema);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should insert new rows and return them', async () => {
    const result = (await TypeOrmUpsert(products, [product('a'), product('b')], 'sku')) as Product[];

    expect(result.map((row) => row.sku).sort()).toEqual(['a', 'b']);
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(await products.count()).toBe(2);
  });

  it('should update conflicting rows and bump updatedAt', async () => {
    await TypeOrmUpsert(products, [product('a'), product('b')], 'sku');
    const before = await products.findOneByOrFail({ sku: 'a' });
    // CURRENT_TIMESTAMP is the transaction start time, so wait for a distinct timestamp
    await new Promise((resolve) => setTimeout(resolve, 20));

    await TypeOrmUpsert(products, [product('a', { name: 'renamed', price: 99 })], 'sku');

    const after = await products.findOneByOrFail({ sku: 'a' });
    expect(after).toMatchObject({ name: 'renamed', price: 99 });
    expect(after.createdAt).toEqual(before.createdAt);
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(await products.findOneByOrFail({ sku: 'b' })).toMatchObject({ name: 'name-b', price: 10 });
    expect(await products.count()).toBe(2);
  });

  it('should keep doNotUpsert columns on update but write them on insert', async () => {
    await TypeOrmUpsert(products, product('a', { createdBy: 'alice' }), 'sku', { doNotUpsert: ['createdBy'] });
    expect((await products.findOneByOrFail({ sku: 'a' })).createdBy).toBe('alice');

    await TypeOrmUpsert(products, product('a', { createdBy: 'bob', price: 20 }), 'sku', { doNotUpsert: ['createdBy'] });

    expect(await products.findOneByOrFail({ sku: 'a' })).toMatchObject({ createdBy: 'alice', price: 20 });
  });

  it('should upsert on a camelCase conflict key with camelCase and snake_case columns', async () => {
    const accounts = dataSource.getRepository(AccountSchema);
    await accounts.save({ externalId: 'ext-1', display_name: 'Alice' });

    const result = (await TypeOrmUpsert(accounts, [{ externalId: 'ext-1', display_name: 'Alicia' } as Account], 'externalId', {
      keyNamingTransform: (k) => k,
      returnStatus: true,
    })) as UpsertResult<Account>[];

    expect(result).toMatchObject([{ entity: { externalId: 'ext-1', display_name: 'Alicia' }, status: 'updated' }]);
    expect(await accounts.count()).toBe(1);
  });

  it('should split large inputs into chunks', async () => {
    const createQueryBuilder = vi.spyOn(products, 'createQueryBuilder');
    const input = Array.from({ length: 2500 }, (_, i) => product(`sku-${i}`));

    const result = (await TypeOrmUpsert(products, input, 'sku', { chunk: 1000 })) as Product[];

    expect(createQueryBuilder).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(2500);
    expect(await products.count()).toBe(2500);
  });

  it('should report inserted and updated status per row', async () => {
    await TypeOrmUpsert(products, product('a'), 'sku');

    const result = (await TypeOrmUpsert(products, [product('a'), product('b')], 'sku', { returnStatus: true })) as UpsertResult<Product>[];

    const statuses = Object.fromEntries(result.map(({ entity, status }) => [entity.sku, status]));
    expect(statuses).toEqual({ a: 'updated', b: 'inserted' });
    expect(result[0].entity).not.toHaveProperty('_upsert_status');
  });

  it('should return a single entity for a single object and an array for an array', async () => {
    const single = await TypeOrmUpsert(products, product('a'), 'sku');
    const many = await TypeOrmUpsert(products, [product('b')], 'sku');
    const singleStatus = await TypeOrmUpsert(products, product('a'), 'sku', { returnStatus: true });

    expect(Array.isArray(single)).toBe(false);
    expect(single).toMatchObject({ sku: 'a' });
    expect(Array.isArray(many)).toBe(true);
    expect(many).toMatchObject([{ sku: 'b' }]);
    expect(singleStatus).toMatchObject({ entity: { sku: 'a' }, status: 'updated' });
  });

  it('should surface database errors for an invalid conflict key', async () => {
    await expect(TypeOrmUpsert(products, product('a'), 'name')).rejects.toThrow(/^Failed to upsert chunk: /);
  });
});
