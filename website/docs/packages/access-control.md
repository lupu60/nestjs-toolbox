---
sidebar_label: "access-control"
---

# @nest-toolbox/access-control

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Faccess-control.svg)](https://www.npmjs.com/package/@nest-toolbox/access-control)

Flexible role-based access control (RBAC) for NestJS, powered by [role-acl](https://github.com/tensult/role-acl) with support for custom conditions, async grants evaluation, and decorator-driven resource/action mapping.

## Installation

```bash
npm install @nest-toolbox/access-control
```

**Peer dependencies:** `@nestjs/common`, `@nestjs/core`, `role-acl`

## Quick Start

### 1. Define your roles, resources, and grants

```typescript
// grants.ts
export const grants = {
  admin: {
    grants: [
      { resource: 'article', action: ['create', 'read', 'update', 'delete'], attributes: ['*'] },
    ],
  },
  user: {
    grants: [
      { resource: 'article', action: ['read'], attributes: ['*'] },
      { resource: 'article', action: ['create'], attributes: ['*', '!publishedAt'] },
    ],
  },
};
```

### 2. Register the module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AccessControlModule, RulesBuilder } from '@nest-toolbox/access-control';
import { grants } from './grants';

@Module({
  imports: [
    AccessControlModule.forRootAsync({
      useFactory: () => new RulesBuilder(grants),
    }),
  ],
})
export class AppModule {}
```

### 3. Protect your controllers

```typescript
// article.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Resource, Action } from '@nest-toolbox/access-control';
import { AclGuard } from './acl.guard';

@Resource('article')
@UseGuards(AuthGuard, AclGuard)
@Controller('articles')
export class ArticleController {
  @Action('read')
  @Get()
  findAll() {
    return this.articleService.findAll();
  }

  @Action('create')
  @Post()
  create(@Body() dto: CreateArticleDto) {
    return this.articleService.create(dto);
  }
}
```

## Features

- 🔐 **Role-based access control** — define grants per role with fine-grained attribute filtering
- 🧩 **Custom conditions** — synchronous or async condition functions for contextual access decisions
- 🎯 **Decorator-driven** — `@Resource()` and `@Action()` decorators for clean controller annotations
- 🏭 **Multiple registration patterns** — `forRules()` (static) and `forRootAsync()` (factory/class/existing)
- 🌐 **Global module** — registered once, available everywhere
- 📋 **Grants endpoint** — optionally expose an HTTP endpoint that returns the current grants
- 💉 **DI-friendly** — inject `RulesBuilder` anywhere with `@InjectRulesBuilder()`

## API Reference

### `AccessControlModule`

Global NestJS module for registering access control rules.

#### `AccessControlModule.forRules(rules, options?)`

Register with a pre-built `RulesBuilder` instance.

```typescript
import { AccessControlModule, RulesBuilder } from '@nest-toolbox/access-control';

const rules = new RulesBuilder(grants);

@Module({
  imports: [
    AccessControlModule.forRules(rules, {
      grantsEndpoint: '/admin/grants', // optional: expose grants via HTTP
    }),
  ],
})
export class AppModule {}
```

##### `ACOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `grantsEndpoint` | `string` | `undefined` | If set, registers a GET endpoint that returns the current grants |

#### `AccessControlModule.forRootAsync(options)`

Register with async factory, class, or existing provider.

```typescript
// Using a factory
AccessControlModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => {
    const grants = config.get('ACCESS_GRANTS');
    return new RulesBuilder(grants, conditions);
  },
  inject: [ConfigService],
});

// Using an existing provider
AccessControlModule.forRootAsync({
  useExisting: MyRulesBuilderService,
});

// Using a class
AccessControlModule.forRootAsync({
  useClass: MyRulesBuilder,
});
```

##### Async Options

| Option | Type | Description |
|--------|------|-------------|
| `imports` | `ModuleMetadata['imports']` | Modules to import for DI |
| `useFactory` | `(...args) => RulesBuilder` | Factory function returning a `RulesBuilder` |
| `useExisting` | `Type<AccessControlOptionsFactory>` | Existing provider to reuse |
| `useClass` | `Type<RulesBuilder>` | Class to instantiate as the rules builder |
| `inject` | `Injection[]` | Tokens to inject into the factory |

### `RulesBuilder`

Extends `AccessControl` from `role-acl`. Use it to define grants and evaluate permissions.

```typescript
import { RulesBuilder } from '@nest-toolbox/access-control';

const rules = new RulesBuilder(grants, conditions);

// Evaluate a permission
const permission = await rules
  .can(['user'])
  .context({ user, workspaceId: 'ws-123' })
  .execute('read')
  .on('article');

if (permission.granted) {
  // access allowed
}
```

### Decorators

#### `@Resource(name: string)`

Class decorator — sets the resource name on a controller.

```typescript
import { Resource } from '@nest-toolbox/access-control';

@Resource('article')
@Controller('articles')
export class ArticleController {}
```

#### `@Action(name: string)`

Method decorator — sets the action name on a route handler.

```typescript
import { Action } from '@nest-toolbox/access-control';

@Action('read')
@Get()
findAll() {}
```

#### `@InjectRulesBuilder()`

Parameter decorator — injects the `RulesBuilder` instance.

```typescript
import { InjectRulesBuilder, RulesBuilder } from '@nest-toolbox/access-control';

@Injectable()
export class AclGuard implements CanActivate {
  constructor(@InjectRulesBuilder() private readonly rules: RulesBuilder) {}
}
```

### Helper Functions

#### `getAction(handler: object)`

Retrieve the action metadata from a route handler.

```typescript
import { getAction } from '@nest-toolbox/access-control';

const action = getAction(context.getHandler());
```

#### `getResource(target: Type)`

Retrieve the resource metadata from a controller class.

```typescript
import { getResource } from '@nest-toolbox/access-control';

const resource = getResource(context.getClass());
```

### `GrantsController`

Built-in controller that exposes grants via a GET endpoint. Automatically registered when `grantsEndpoint` is provided to `forRules()`.

## Examples

### Custom conditions for contextual access

Define synchronous or async condition functions to make access decisions based on runtime context:

```typescript
// conditions.ts
import { IDictionary, IFunctionCondition } from '@nest-toolbox/access-control';

export const conditions: IDictionary<IFunctionCondition> = {
  isWorkspaceMember(context: { user: any; workspaceId: string }): boolean {
    return context.user.workspaces.includes(context.workspaceId);
  },

  async isResourceOwner(context: { user: any; resourceOwnerId: string }): Promise<boolean> {
    return context.user.id === context.resourceOwnerId;
  },
};
```

Reference conditions in your grants using the `custom:` prefix:

```typescript
// grants.ts
export const grants = {
  user: {
    grants: [
      {
        resource: 'document',
        action: 'read',
        attributes: ['*'],
        condition: {
          Fn: 'custom:isWorkspaceMember',
          args: {},
        },
      },
      {
        resource: 'document',
        action: 'update',
        attributes: ['*'],
        condition: {
          Fn: 'custom:isResourceOwner',
          args: {},
        },
      },
    ],
  },
};
```

Register with conditions:

```typescript
AccessControlModule.forRootAsync({
  useFactory: () => new RulesBuilder(grants, conditions),
});
```

### Full ACL guard implementation

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { getAction, getResource, InjectRulesBuilder, RulesBuilder } from '@nest-toolbox/access-control';

@Injectable()
export class AclGuard implements CanActivate {
  constructor(@InjectRulesBuilder() private readonly rules: RulesBuilder) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new UnauthorizedException();
    }

    const resource = getResource(context.getClass());
    const action = getAction(context.getHandler());

    // If no resource/action metadata, allow through
    if (!resource || !action) {
      return true;
    }

    const permission = await this.rules
      .can(user.roles)
      .context({ user, workspaceId: request.headers['x-workspace-id'] })
      .execute(action)
      .on(resource);

    return permission.granted;
  }
}
```

### Exposing grants for debugging

```typescript
@Module({
  imports: [
    AccessControlModule.forRules(new RulesBuilder(grants, conditions), {
      grantsEndpoint: '/admin/grants',
    }),
  ],
})
export class AppModule {}

// GET /admin/grants → returns the full grants object
```
