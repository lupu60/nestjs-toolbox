// Runs inside the throwaway consumer project created by scripts/smoke-pack.mjs.
// Loads every installed @nest-toolbox package from its tarball and boots a real Nest app on the compiled output,
// which catches broken entry points and dependency-injection metadata that source-level tests cannot see.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { Controller, Get, Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');

const installed = JSON.parse(process.env.SMOKE_PACKAGES);
const has = (name) => installed.includes(name);
const load = (name) => require(`@nest-toolbox/${name}`);

// version-generator's entry point is its CLI; smoke-pack.mjs exercises it through the bin instead
for (const name of installed.filter((name) => name !== 'version-generator')) {
  const exported = Object.keys(load(name));
  assert.ok(exported.length > 0, `@nest-toolbox/${name} exports nothing`);
  console.log(`  loaded @nest-toolbox/${name} (${exported.length} exports)`);
}

class PingController {
  ping() {
    return { pong: true };
  }
}
Reflect.decorate([Get()], PingController.prototype, 'ping', Object.getOwnPropertyDescriptor(PingController.prototype, 'ping'));
Reflect.decorate([Controller('ping')], PingController);

const imports = [];
const middlewares = [];

if (has('request-context')) {
  imports.push(load('request-context').RequestContextModule.forRoot());
}
if (has('response-envelope')) {
  imports.push(load('response-envelope').ResponseEnvelopeModule.forRoot());
}
if (has('access-control')) {
  const { AccessControlModule, RulesBuilder } = load('access-control');
  const rules = new RulesBuilder([{ role: 'viewer', resource: 'videos', action: 'read', attributes: ['*'] }]);
  imports.push(AccessControlModule.forRules(rules, { grantsEndpoint: 'grants' }));
}
if (has('http-logger-middleware')) {
  middlewares.push(load('http-logger-middleware').HttpLoggerMiddleware);
}
if (has('typeorm-audit-log')) {
  const { TypeOrmModule } = require('@nestjs/typeorm');
  const { AuditContextMiddleware, AuditLog, AuditLogModule } = load('typeorm-audit-log');
  imports.push(TypeOrmModule.forRoot({ type: 'sqljs', synchronize: true, entities: [AuditLog] }), AuditLogModule.forRoot());
  middlewares.push(AuditContextMiddleware);
}

class AppModule {
  configure(consumer) {
    if (middlewares.length > 0) {
      consumer.apply(...middlewares).forRoutes(PingController);
    }
  }
}
Reflect.decorate([Module({ imports, controllers: [PingController] })], AppModule);

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();

  try {
    const response = await fetch(`${url}/ping`);
    const body = await response.json();
    assert.equal(response.status, 200, `GET /ping failed: ${JSON.stringify(body)}`);

    if (has('response-envelope')) {
      assert.equal(body.success, true);
      assert.deepEqual(body.data, { pong: true });
    } else {
      assert.deepEqual(body, { pong: true });
    }
    if (has('request-context')) {
      assert.ok(response.headers.get('x-request-id'), 'request-context did not set x-request-id');
    }
    if (has('access-control')) {
      const grants = await (await fetch(`${url}/grants`)).json();
      assert.ok(JSON.stringify(grants).includes('viewer'), 'access-control did not serve grants');
    }
    if (has('typeorm-audit-log')) {
      const { DataSource } = require('typeorm');
      const { AuditLogService, AuditLogSubscriber } = load('typeorm-audit-log');
      assert.ok(app.get(AuditLogService), 'AuditLogService is not resolvable');
      assert.ok(app.get(DataSource).subscribers.includes(app.get(AuditLogSubscriber)), 'audit subscriber is not registered');
    }
    console.log('  booted a Nest app on the packed output');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
