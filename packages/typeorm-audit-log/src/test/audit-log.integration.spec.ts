import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, type Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditContextRun } from '../audit-context';
import { AuditLog } from '../audit-log.entity';
import { AuditLogService } from '../audit-log.service';
import { AuditLogSubscriber } from '../audit-log.subscriber';
import { Auditable, AuditIgnore, AuditMask } from '../decorators';
import { AuditAction } from '../types';

// Integration tests against a real in-memory SQLite database (sql.js)

@Entity('accounts')
@Auditable()
class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  @AuditMask()
  email!: string;

  @Column({ type: 'varchar' })
  @AuditIgnore()
  password!: string;
}

@Entity('notes')
class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  text!: string;
}

describe('typeorm-audit-log (sql.js integration)', () => {
  let dataSource: DataSource;
  let auditRepository: Repository<AuditLog>;
  let accounts: Repository<Account>;
  let service: AuditLogService;

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqljs', synchronize: true, entities: [AuditLog, Account, Note] });
    await dataSource.initialize();
    auditRepository = dataSource.getRepository(AuditLog);
    accounts = dataSource.getRepository(Account);
    service = new AuditLogService(auditRepository, { excludeFields: [], async: false });
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('AuditLogService', () => {
    it('should persist an entry with context, masked and ignored fields, and a diff', async () => {
      const account = accounts.create({ id: 7, name: 'Alicia', email: 'alice@example.com', password: 'secret' });

      await auditContextRun(
        { userId: 'user-1', userName: 'admin@example.com', ip: '10.0.0.1', userAgent: 'vitest', metadata: { requestId: 'r-1' } },
        () =>
          service.log({
            action: AuditAction.UPDATE,
            entity: account,
            entityName: 'Account',
            entityId: '7',
            oldValues: { id: 7, name: 'Alice', email: 'alice@example.com', password: 'old-secret' },
          }),
      );

      const [entry] = await auditRepository.find();
      expect(entry).toMatchObject({
        entityName: 'Account',
        entityId: '7',
        action: AuditAction.UPDATE,
        userId: 'user-1',
        userName: 'admin@example.com',
        ip: '10.0.0.1',
        userAgent: 'vitest',
        metadata: { requestId: 'r-1' },
      });
      expect(entry.id).toEqual(expect.any(String));
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.newValues).toEqual({ id: 7, name: 'Alicia', email: 'alic***.com' });
      expect(entry.oldValues).toEqual({ id: 7, name: 'Alice', email: 'alic***.com' });
      expect(entry.diff).toEqual([{ field: 'name', oldValue: 'Alice', newValue: 'Alicia' }]);
    });

    it('should apply globally excluded fields', async () => {
      const globalService = new AuditLogService(auditRepository, { excludeFields: ['email'] });

      await globalService.log({
        action: AuditAction.CREATE,
        entity: accounts.create({ id: 1, name: 'Bob', email: 'bob@example.com', password: 'pw' }),
        entityName: 'Account',
        entityId: '1',
      });

      const [entry] = await auditRepository.find();
      expect(entry.newValues).toEqual({ id: 1, name: 'Bob' });
      expect(entry.userId).toBeNull();
      expect(entry.diff).toBeNull();
    });

    it('should query entries by entity, user and filters', async () => {
      const log = (userId: string, entityName: string, entityId: string, action: AuditAction) =>
        auditContextRun({ userId }, () => service.log({ action, entity: { id: entityId }, entityName, entityId }));

      await log('user-1', 'Account', '1', AuditAction.CREATE);
      await log('user-1', 'Account', '1', AuditAction.UPDATE);
      await log('user-2', 'Account', '2', AuditAction.CREATE);
      await log('user-2', 'Note', '1', AuditAction.DELETE);

      expect(await service.findByEntity('Account', '1')).toHaveLength(2);
      expect(await service.findByEntity('Account', '1', { action: AuditAction.UPDATE })).toHaveLength(1);
      expect(await service.findByEntity('Account', '1', { limit: 1 })).toHaveLength(1);

      expect(await service.findByUser('user-2')).toHaveLength(2);
      expect(await service.findByUser('user-2', { entityName: 'Note' })).toHaveLength(1);
      expect(await service.findByUser('nobody')).toHaveLength(0);

      const page = await service.findAll({ limit: 3 });
      expect(page).toMatchObject({ total: 4, page: 1, limit: 3, totalPages: 2 });
      expect(page.items).toHaveLength(3);
      expect((await service.findAll({ page: 2, limit: 3 })).items).toHaveLength(1);
      expect((await service.findAll({ userId: 'user-1', action: AuditAction.CREATE })).total).toBe(1);
    });
  });

  describe('AuditLogSubscriber', () => {
    let subscriber: AuditLogSubscriber;

    beforeEach(() => {
      subscriber = new AuditLogSubscriber();
      subscriber.setAuditLogService(service);
      subscriber.registerWithDataSource(dataSource);
    });

    it('should not register the same subscriber twice', () => {
      subscriber.registerWithDataSource(dataSource);

      expect(dataSource.subscribers.filter((s) => s === subscriber)).toHaveLength(1);
    });

    it('should log inserts of auditable entities with the request context', async () => {
      const saved = await auditContextRun({ userId: 'user-1' }, () =>
        accounts.save(accounts.create({ name: 'Alice', email: 'alice@example.com', password: 'secret' })),
      );

      await vi.waitFor(async () => expect(await auditRepository.count()).toBe(1));
      const [entry] = await auditRepository.find();
      expect(entry).toMatchObject({ entityName: 'Account', entityId: String(saved.id), action: AuditAction.CREATE, userId: 'user-1' });
      expect(entry.newValues).toMatchObject({ name: 'Alice', email: 'alic***.com' });
      expect(entry.newValues).not.toHaveProperty('password');
    });

    it('should log updates with a diff against the database values', async () => {
      const saved = await accounts.save(accounts.create({ name: 'Alice', email: 'alice@example.com', password: 'secret' }));
      await vi.waitFor(async () => expect(await auditRepository.count()).toBe(1));

      saved.name = 'Alicia';
      await accounts.save(saved);

      await vi.waitFor(async () => expect(await auditRepository.count({ where: { action: AuditAction.UPDATE } })).toBe(1));
      const entry = await auditRepository.findOneByOrFail({ action: AuditAction.UPDATE });
      expect(entry.entityId).toBe(String(saved.id));
      expect(entry.diff).toEqual([{ field: 'name', oldValue: 'Alice', newValue: 'Alicia' }]);
    });

    it('should log removals', async () => {
      const saved = await accounts.save(accounts.create({ name: 'Alice', email: 'alice@example.com', password: 'secret' }));
      await vi.waitFor(async () => expect(await auditRepository.count()).toBe(1));

      await accounts.remove(saved);

      await vi.waitFor(async () => expect(await auditRepository.count({ where: { action: AuditAction.DELETE } })).toBe(1));
      const entry = await auditRepository.findOneByOrFail({ action: AuditAction.DELETE });
      expect(entry.entityName).toBe('Account');
      expect(entry.oldValues).toMatchObject({ name: 'Alice' });
    });

    it('should ignore entities without @Auditable', async () => {
      await dataSource.getRepository(Note).save({ text: 'hello' });
      await accounts.save(accounts.create({ name: 'Alice', email: 'alice@example.com', password: 'secret' }));

      await vi.waitFor(async () => expect(await auditRepository.count()).toBe(1));
      const entries = await auditRepository.find();
      expect(entries.map((e) => e.entityName)).toEqual(['Account']);
    });
  });
});
