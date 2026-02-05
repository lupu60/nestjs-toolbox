---
sidebar_position: 1
slug: /
---

# Getting Started

**NestJS Toolbox** is a growing collection of practical NestJS components — TypeORM utilities, logging, access control, API helpers, and more.

Each package is independently installable, lightweight, and follows a **decorator-first, zero-config** philosophy.

## Installation

All packages are published under the `@nest-toolbox` npm scope. Install only what you need:

```bash
npm install @nest-toolbox/response-envelope
npm install @nest-toolbox/request-context
npm install @nest-toolbox/typeorm-audit-log
# ... etc
```

## Packages Overview

### 🗄️ TypeORM Utilities

| Package | Description |
|---------|-------------|
| [typeorm-audit-log](/docs/packages/typeorm-audit-log) | Automatic audit logging with user attribution and diff tracking |
| [typeorm-paginate](/docs/packages/typeorm-paginate) | Simple, efficient pagination for TypeORM queries |
| [typeorm-soft-delete](/docs/packages/typeorm-soft-delete) | Soft delete utilities with enhanced DX |
| [typeorm-upsert](/docs/packages/typeorm-upsert) | Upsert (insert or update) operations for TypeORM |

### 📝 Logging

| Package | Description |
|---------|-------------|
| [bunyan-logger](/docs/packages/bunyan-logger) | NestJS LoggerService backed by Bunyan |
| [winston-logger](/docs/packages/winston-logger) | NestJS LoggerService backed by Winston |
| [http-logger-middleware](/docs/packages/http-logger-middleware) | HTTP request/response logging middleware |
| [bootstrap-log](/docs/packages/bootstrap-log) | Pretty bootstrap log with your app configs |

### 🔧 Utilities

| Package | Description |
|---------|-------------|
| [access-control](/docs/packages/access-control) | Flexible role-based access control using role-acl |
| [request-context](/docs/packages/request-context) | Lightweight AsyncLocalStorage-based request context with auto-generated request IDs |
| [response-envelope](/docs/packages/response-envelope) | Standard API response envelope with interceptor and helpers |
| [open-api-spec-to-ts](/docs/packages/open-api-spec-to-ts) | Generate TypeScript interfaces from OpenAPI specs |
| [version-generator](/docs/packages/version-generator) | Generate version info from git metadata |
| [progress-bar](/docs/packages/progress-bar) | Simple CLI progress bar for long-running tasks |

## Philosophy

- **Safety > Performance > Developer Experience** — in that order
- **Decorator-first** — `@SkipEnvelope()`, `@Auditable()`, `@ApiMessage()` — just works
- **Zero config** — sensible defaults, opt-in customization via `forRoot()`
- **Zero technical debt** — tested, linted, typed
- **Minimal dependencies** — each package pulls only what it needs

## Contributing

PRs welcome! See the [GitHub repository](https://github.com/lupu60/nestjs-toolbox) for contribution guidelines.
