import { DataSource, EntitySchema, type Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  count,
  findOnlyDeleted,
  findWithDeleted,
  forceDelete,
  isSoftDeleted,
  restore,
  rowsOnlyDeleted,
  rowsWithDeleted,
  softDelete,
  validateSoftDeleteSupport,
  withSoftDelete,
} from '../index';

// Integration tests against a real in-memory SQLite database (sql.js)

interface Person {
  id: number;
  name: string;
  team: string;
  deletedAt: Date | null;
}

interface Plain {
  id: number;
  name: string;
}

const PersonSchema = new EntitySchema<Person>({
  name: 'Person',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String },
    team: { type: String },
    deletedAt: { type: 'datetime', deleteDate: true, nullable: true },
  },
});

const PlainSchema = new EntitySchema<Plain>({
  name: 'Plain',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String },
  },
});

describe('typeorm-soft-delete (sql.js integration)', () => {
  let dataSource: DataSource;
  let repository: Repository<Person>;
  let ids: Record<string, number>;

  const names = (people: Person[]) => people.map((person) => person.name).sort();

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqljs', synchronize: true, entities: [PersonSchema, PlainSchema] });
    await dataSource.initialize();
    repository = dataSource.getRepository(PersonSchema);
    const saved = await repository.save([
      { name: 'alice', team: 'red' },
      { name: 'bob', team: 'red' },
      { name: 'carol', team: 'blue' },
      { name: 'dave', team: 'blue' },
    ]);
    ids = Object.fromEntries(saved.map((person) => [person.name, person.id]));
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('softDelete', () => {
    it('should soft delete by id and hide the row from regular queries', async () => {
      const result = await softDelete(repository, ids.alice);

      expect(result.affected).toBe(1);
      expect(names(await repository.find())).toEqual(['bob', 'carol', 'dave']);
      expect(names(await findWithDeleted(repository))).toEqual(['alice', 'bob', 'carol', 'dave']);

      const row = await repository.findOne({ where: { id: ids.alice }, withDeleted: true });
      expect(row?.deletedAt).toBeInstanceOf(Date);
    });

    it('should soft delete an array of ids', async () => {
      const result = await softDelete(repository, [ids.alice, ids.bob]);

      expect(result.affected).toBe(2);
      expect(names(await repository.find())).toEqual(['carol', 'dave']);
    });

    it('should soft delete by where clause', async () => {
      const result = await softDelete(repository, { team: 'blue' });

      expect(result.affected).toBe(2);
      expect(names(await repository.find())).toEqual(['alice', 'bob']);
    });

    it('should not touch rows that are already soft deleted', async () => {
      await softDelete(repository, ids.alice);
      const before = await repository.findOne({ where: { id: ids.alice }, withDeleted: true });

      const result = await softDelete(repository, ids.alice);

      expect(result.affected).toBe(0);
      const after = await repository.findOne({ where: { id: ids.alice }, withDeleted: true });
      expect(after?.deletedAt).toEqual(before?.deletedAt);
    });

    it('should throw with validateExists when nothing was deleted', async () => {
      await expect(softDelete(repository, 9999, { validateExists: true })).rejects.toThrow('Entity not found or already deleted');
    });

    it('should reject entities without a delete date column', async () => {
      const plainRepository = dataSource.getRepository(PlainSchema);

      expect(() => validateSoftDeleteSupport(plainRepository)).toThrow('does not have @DeleteDateColumn');
      await expect(softDelete(plainRepository as unknown as Repository<Person>, 1)).rejects.toThrow('does not have @DeleteDateColumn');
    });
  });

  describe('restore', () => {
    it('should restore a soft deleted row', async () => {
      await softDelete(repository, ids.alice);

      const result = await restore(repository, ids.alice);

      expect(result.affected).toBe(1);
      expect(names(await repository.find())).toEqual(['alice', 'bob', 'carol', 'dave']);
      expect(await isSoftDeleted(repository, ids.alice)).toBe(false);
    });

    it('should not count active rows as restored', async () => {
      const result = await restore(repository, [ids.alice, ids.bob]);

      expect(result.affected).toBe(0);
    });

    it('should throw with validateExists when nothing was restored', async () => {
      await expect(restore(repository, ids.alice, { validateExists: true })).rejects.toThrow('Entity not found or not soft-deleted');
    });
  });

  describe('forceDelete', () => {
    it('should permanently delete a soft deleted row', async () => {
      await softDelete(repository, ids.alice);

      const result = await forceDelete(repository, ids.alice);

      expect(result.affected).toBe(1);
      expect(names(await findWithDeleted(repository))).toEqual(['bob', 'carol', 'dave']);
    });

    it('should never hard delete rows that are not soft deleted', async () => {
      const result = await forceDelete(repository, ids.alice);

      expect(result.affected).toBe(0);
      expect(names(await repository.find())).toEqual(['alice', 'bob', 'carol', 'dave']);
    });

    it('should only hard delete the soft deleted rows matched by a where clause', async () => {
      await softDelete(repository, ids.carol);

      const result = await forceDelete(repository, { team: 'blue' });

      expect(result.affected).toBe(1);
      expect(names(await findWithDeleted(repository))).toEqual(['alice', 'bob', 'dave']);
    });
  });

  describe('queries', () => {
    beforeEach(async () => {
      await softDelete(repository, [ids.alice, ids.carol]);
    });

    it('should find only soft deleted rows', async () => {
      expect(names(await findOnlyDeleted(repository))).toEqual(['alice', 'carol']);
      expect(names(await findOnlyDeleted(repository, { where: { team: 'red' } }))).toEqual(['alice']);
    });

    it('should count with and without soft deleted rows', async () => {
      expect(await count(repository)).toBe(2);
      expect(await count(repository, { includeDeleted: true })).toBe(4);
      expect(await count(repository, { where: { team: 'blue' }, includeDeleted: true })).toBe(2);
    });

    it('should report soft deleted state and throw for missing rows', async () => {
      expect(await isSoftDeleted(repository, ids.alice)).toBe(true);
      expect(await isSoftDeleted(repository, ids.bob)).toBe(false);
      await expect(isSoftDeleted(repository, 9999)).rejects.toThrow('Entity not found');
    });

    it('should expose the same behaviour through withSoftDelete', async () => {
      const wrapped = withSoftDelete(repository);

      expect(await wrapped.count()).toBe(2);
      expect((await wrapped.restore(ids.alice)).affected).toBe(1);
      expect(names(await wrapped.find())).toEqual(['alice', 'bob', 'dave']);
      expect(names(await wrapped.findOnlyDeleted())).toEqual(['carol']);
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      await softDelete(repository, [ids.alice, ids.carol]);
    });

    it('should exclude soft deleted rows by default', async () => {
      const results = [];
      for await (const row of rowsWithDeleted({ repository, where: {}, limit: 1 })) {
        results.push(row);
      }

      expect(names(results.map((row) => row.data))).toEqual(['bob', 'dave']);
      expect(results.map((row) => row.index)).toEqual([0, 1]);
      expect(results[results.length - 1].progress).toBe(1);
    });

    it('should include soft deleted rows when requested', async () => {
      const results = [];
      for await (const row of rowsWithDeleted({ repository, where: {}, includeDeleted: true, limit: 3 })) {
        results.push(row);
      }

      expect(names(results.map((row) => row.data))).toEqual(['alice', 'bob', 'carol', 'dave']);
    });

    it('should apply the soft delete filter to every branch of an array where clause', async () => {
      const results = [];
      for await (const row of rowsWithDeleted({ repository, where: [{ name: 'alice' }, { name: 'bob' }] })) {
        results.push(row);
      }

      expect(names(results.map((row) => row.data))).toEqual(['bob']);
    });

    it('should paginate only soft deleted rows', async () => {
      const results = [];
      for await (const row of rowsOnlyDeleted({ repository, where: {}, limit: 1 })) {
        results.push(row);
      }

      expect(names(results.map((row) => row.data))).toEqual(['alice', 'carol']);
    });
  });
});
