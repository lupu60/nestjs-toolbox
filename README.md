<div align="center">
   <h1>Nestjs Toolbox 🧰</h1>
</div>
<div align="center">
   <strong>A growing collection of practical NestJS components — TypeORM utilities, logging, access control, and more.</strong>
</div>
<br />
<div align="center">
   <a href="#">
    <img alt="GitHub License" src="https://img.shields.io/github/license/lupu60/nestjs-toolbox">
   </a>
   <a href="https://lerna.js.org/">
     <img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg"  />
   </a>
   <a href="https://www.codefactor.io/repository/github/lupu60/nestjs-toolbox">
     <img src="https://www.codefactor.io/repository/github/lupu60/nestjs-toolbox/badge" alt="CodeFactor" />
   </a>
   <a href="https://deepscan.io/dashboard#view=project&tid=5310&pid=7118&bid=66230">
     <img src="https://deepscan.io/api/teams/5310/projects/7118/branches/66230/badge/grade.svg" alt="DeepScan grade">
   </a>
   <a href="#contributors-">
     <img src="https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square"  />
   </a>
   <a href="https://nestjs.com" target="_blank">
     <img src="https://img.shields.io/badge/build%20for-NestJS-red.svg" alt="Built for NestJS" />
   </a>
   <a href="https://github.com/juliandavidmr/awesome-nestjs#components--libraries">
     <img src="https://awesome.re/mentioned-badge.svg" alt="Awesome Nest" />
   </a>
     <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" />
</div>

---

## Packages

### 🗄️ TypeORM Utilities

| Package | Description |
|---------|-------------|
| [typeorm-audit-log](./packages/typeorm-audit-log) | Automatic audit logging with user attribution, diff tracking, and queryable trails |
| [typeorm-paginate](./packages/typeorm-paginate) | Simple, efficient pagination for TypeORM queries |
| [typeorm-soft-delete](./packages/typeorm-soft-delete) | Soft delete utilities with enhanced DX |
| [typeorm-upsert](./packages/typeorm-upsert) | Upsert (insert or update) operations for TypeORM |

### 📝 Logging

| Package | Description |
|---------|-------------|
| [bunyan-logger](./packages/bunyan-logger) | NestJS LoggerService backed by Bunyan |
| [winston-logger](./packages/winston-logger) | NestJS LoggerService backed by Winston |
| [http-logger-middleware](./packages/http-logger-middleware) | HTTP request/response logging middleware |
| [bootstrap-log](./packages/bootstrap-log) | Pretty bootstrap log with your app configs |

### 🔧 Utilities

| Package | Description |
|---------|-------------|
| [access-control](./packages/access-control) | Flexible role-based access control using role-acl |
| [open-api-spec-to-ts](./packages/open-api-spec-to-ts) | Generate TypeScript interfaces from OpenAPI specs |
| [version-generator](./packages/version-generator) | Generate version info from git metadata |
| [progress-bar](./packages/progress-bar) | Simple CLI progress bar for long-running tasks |

---

## Quick Examples

### Audit Log — Track every entity change automatically

```typescript
import { AuditLogModule, AuditContextMiddleware, Auditable } from '@nest-toolbox/typeorm-audit-log';

// 1. Register the module
@Module({
  imports: [
    AuditLogModule.forRoot({
      retentionDays: 90,
      excludeFields: ['password', 'refreshToken'],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}

// 2. Decorate your entity
@Entity()
@Auditable()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  @AuditIgnore() // skip sensitive fields
  password: string;
}
// That's it — all User changes are now logged with who, what, and when.
```

### Pagination — One-liner paginated queries

```typescript
import { paginate } from '@nest-toolbox/typeorm-paginate';

const result = await paginate(userRepository, { page: 1, limit: 25 });
// → { items: [...], meta: { totalItems, itemCount, itemsPerPage, totalPages, currentPage } }
```

### Soft Delete — Never lose data

```typescript
import { SoftDeleteEntity } from '@nest-toolbox/typeorm-soft-delete';

@Entity()
export class Post extends SoftDeleteEntity {
  @Column()
  title: string;
}
// Posts are soft-deleted by default — easily restore or permanently remove.
```

### Access Control — Role-based permissions

```typescript
import { UseRoles } from '@nest-toolbox/access-control';

@Controller('documents')
export class DocumentController {
  @Get()
  @UseRoles({
    resource: 'document',
    action: 'read',
    possession: 'any',
  })
  findAll() { ... }
}
```

---

## Installation

Each package is published independently on npm under the `@nest-toolbox` scope:

```bash
npm install @nest-toolbox/typeorm-audit-log
npm install @nest-toolbox/typeorm-paginate
npm install @nest-toolbox/typeorm-soft-delete
# ... etc
```

See each package's README for full documentation and API reference.

## Sponsors

<a href="https://www.jetbrains.com/?from=nestjs-toolbox">
     <img src="https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.png"  alt="JetBrains" width="150"/>
</a>

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://getlarge.eu"><img src="https://avatars1.githubusercontent.com/u/15331923?v=4" width="100px;" alt=""/><br /><sub><b>getlarge</b></sub></a><br /><a href="https://github.com/lupu60/nestjs-toolbox/commits?author=getlarge" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
