# NestJS Toolbox Showcase Application

A comprehensive demonstration application showcasing all packages from the [@nest-toolbox](https://www.npmjs.com/org/nest-toolbox) monorepo. This project provides working examples, e2e tests, and documentation for each utility package.

## 📦 Featured Packages

This showcase demonstrates **11 @nest-toolbox packages** (all at version 1.8.1):

- `@nest-toolbox/typeorm-upsert` - Upsert operations for TypeORM
- `@nest-toolbox/typeorm-paginate` - Pagination utilities for TypeORM
- `@nest-toolbox/typeorm-soft-delete` - Soft delete functionality for TypeORM
- `@nest-toolbox/bunyan-logger` - Bunyan logger integration for NestJS
- `@nest-toolbox/winston-logger` - Winston logger integration for NestJS
- `@nest-toolbox/http-logger-middleware` - HTTP request/response logging middleware
- `@nest-toolbox/bootstrap-log` - Beautiful bootstrap logs for application startup
- `@nest-toolbox/access-control` - Role-based access control utilities
- `@nest-toolbox/version-generator` - Application version generation
- `@nest-toolbox/progress-bar` - Progress bar utilities
- `@nest-toolbox/open-api-spec-to-ts` - OpenAPI specification to TypeScript converter

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (for containerized environment)
- Node.js 22.x (for local development)
- PostgreSQL 16.x (for local development without Docker)

### Running with Docker (Recommended)

1. **Start the application**:
```bash
cd show_case
npm run docker:up
```

2. **Access the application**:
   - API: http://localhost:3000
   - Swagger UI: http://localhost:3000/api
   - Health Check: http://localhost:3000/health

3. **Stop the application**:
```bash
npm run docker:down
```

### Running Locally

1. **Install dependencies**:
```bash
cd show_case
npm install --legacy-peer-deps
```

2. **Start PostgreSQL** (or use Docker):
```bash
docker run -d \
  --name postgres-showcase \
  -e POSTGRES_USER=showcase \
  -e POSTGRES_PASSWORD=showcase123 \
  -e POSTGRES_DB=nestjs_toolbox_showcase \
  -p 5432:5432 \
  postgres:16-alpine
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env if needed
```

4. **Start the application**:
```bash
npm run start:dev
```

5. **Access the application**:
   - API: http://localhost:3000
   - Swagger UI: http://localhost:3000/api

## 🧪 Running Tests

### E2E Tests Locally

```bash
# Run all e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:e2e:watch

# Run specific test file
npm run test:e2e -- typeorm-upsert.e2e-spec.ts
```

### E2E Tests in Docker

```bash
# Run tests in isolated Docker environment
npm run test:e2e:docker
```

This command:
- Builds a test Docker image
- Starts a PostgreSQL test database
- Runs all e2e tests
- Tears down containers after completion

## 📚 API Documentation

### Swagger/OpenAPI

Access the interactive API documentation at http://localhost:3000/api

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Package demonstrations for each endpoint

### Key Endpoints

#### User Management (TypeORM Utilities Demo)

- `POST /users` - Create a new user
- `POST /users/upsert` - **Upsert demo** (@nest-toolbox/typeorm-upsert)
- `GET /users` - **Pagination demo** (@nest-toolbox/typeorm-paginate)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id/soft` - **Soft delete demo** (@nest-toolbox/typeorm-soft-delete) [Admin only]
- `POST /users/:id/restore` - **Restore demo** (@nest-toolbox/typeorm-soft-delete)
- `DELETE /users/:id/force` - **Force delete demo** (@nest-toolbox/typeorm-soft-delete)
- `GET /users/deleted` - Get soft-deleted users

#### Health & Version

- `GET /health` - Health check
- `GET /health/version` - **Version info demo** (@nest-toolbox/version-generator)

### Testing Access Control

To test the access control package, include the `x-user-role` header:

```bash
# Delete user (requires admin role)
curl -X DELETE http://localhost:3000/users/{id}/soft \
  -H "x-user-role: admin"

# Without admin role (will return 403)
curl -X DELETE http://localhost:3000/users/{id}/soft \
  -H "x-user-role: user"
```

## 🏗️ Project Structure

```
show_case/
├── src/
│   ├── common/
│   │   ├── decorators/      # Custom decorators (Roles)
│   │   ├── guards/          # Guards (RolesGuard)
│   │   ├── logger/          # Logger module (Bunyan)
│   │   └── middleware/      # HTTP logger middleware
│   ├── config/              # Configuration files
│   │   └── database.config.ts
│   ├── entities/            # TypeORM entities
│   │   ├── user.entity.ts
│   │   └── product.entity.ts
│   ├── modules/
│   │   ├── user/           # User module (demos TypeORM utilities)
│   │   │   ├── dto/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.module.ts
│   │   └── health/         # Health check module
│   ├── app.module.ts
│   └── main.ts             # Bootstrap with @nest-toolbox/bootstrap-log
├── test/
│   ├── typeorm-upsert.e2e-spec.ts      # Upsert package tests
│   ├── typeorm-paginate.e2e-spec.ts    # Pagination package tests
│   ├── typeorm-soft-delete.e2e-spec.ts # Soft delete package tests
│   └── general-packages.e2e-spec.ts    # Other packages tests
├── docker/
│   └── postgres/
│       └── init.sql
├── docker-compose.yml           # Development environment
├── docker-compose.test.yml      # Test environment
├── Dockerfile                   # Production image
├── Dockerfile.test              # Test image
└── README.md
```

## 📖 Package Demonstrations

### TypeORM Upsert (@nest-toolbox/typeorm-upsert)

```typescript
// In UserService
const result = await upsert(
  this.userRepository,
  createUserDto,
  ['email'],                    // Conflict columns
  ['firstName', 'lastName'],    // Columns to update on conflict
);
```

**Demo endpoint**: `POST /users/upsert`

### TypeORM Paginate (@nest-toolbox/typeorm-paginate)

```typescript
// In UserService
const queryBuilder = this.userRepository.createQueryBuilder('user');
return paginate<User>(queryBuilder, {
  page: paginateDto.page,
  limit: paginateDto.limit,
});
```

**Demo endpoint**: `GET /users?page=1&limit=10&sortBy=email&sortOrder=ASC`

### TypeORM Soft Delete (@nest-toolbox/typeorm-soft-delete)

```typescript
// Soft delete
await softDelete(this.userRepository, userId);

// Restore
await restore(this.userRepository, userId);

// Force delete (permanent)
await forceDelete(this.userRepository, userId);
```

**Demo endpoints**:
- `DELETE /users/:id/soft`
- `POST /users/:id/restore`
- `DELETE /users/:id/force`

### Bunyan Logger (@nest-toolbox/bunyan-logger)

```typescript
// In LoggerModule
new BunyanLoggerService({
  name: 'nestjs-toolbox-showcase',
  level: 'debug',
  src: true,
});
```

Logs are automatically generated for all application operations.

### HTTP Logger Middleware (@nest-toolbox/http-logger-middleware)

```typescript
// In AppModule
new HttpLoggerMiddleware({
  enabled: true,
  logRequestBody: true,
  logResponseBody: true,
  excludePaths: ['/health'],
});
```

All HTTP requests are logged automatically (except excluded paths).

### Bootstrap Log (@nest-toolbox/bootstrap-log)

```typescript
// In main.ts
bootstrapLog(
  'NestJS Toolbox Showcase API',
  'http://localhost:3000',
  'http://localhost:3000/api',
);
```

Beautiful console output on application startup.

### Access Control (@nest-toolbox/access-control)

```typescript
// In Controller
@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':id/soft')
softDelete(@Param('id') id: string) {
  return this.userService.softDelete(id);
}
```

**Demo**: Try deleting a user with and without the `x-user-role: admin` header.

### Version Generator (@nest-toolbox/version-generator)

```typescript
// In HealthController
import { getVersion } from '@nest-toolbox/version-generator';

version() {
  return {
    version: getVersion(),
    node: process.version,
  };
}
```

**Demo endpoint**: `GET /health/version`

## 🧪 E2E Test Coverage

The showcase includes comprehensive e2e tests:

### TypeORM Upsert Tests
- Insert new records
- Update on conflict
- Handle multiple upserts
- Validation errors

### TypeORM Paginate Tests
- Default pagination
- Custom page/limit
- Sorting (ASC/DESC)
- Edge cases (empty, last page)
- Large limits

### TypeORM Soft Delete Tests
- Soft delete with access control
- Restore deleted records
- Force delete (permanent)
- List deleted records
- Integration with pagination

### General Package Tests
- Version generator
- Bootstrap log
- HTTP logger middleware
- Bunyan logger
- Swagger/OpenAPI documentation
- Access control (roles)
- Validation and error handling

## 🐳 Docker Setup

### Development Environment (docker-compose.yml)

- **PostgreSQL**: Port 5432
- **Application**: Port 3000
- **Features**: Hot reload, persistent data volume

### Test Environment (docker-compose.test.yml)

- **PostgreSQL Test**: Port 5433 (isolated)
- **Test Runner**: Runs e2e tests
- **Features**: Temporary database (tmpfs), clean environment

## 🔧 Environment Variables

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=showcase
DATABASE_PASSWORD=showcase123
DATABASE_NAME=nestjs_toolbox_showcase

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Testing
TEST_DATABASE_NAME=nestjs_toolbox_showcase_test
```

## 📝 Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## 🤝 Contributing

This showcase is part of the nestjs-toolbox monorepo. For issues or contributions, please refer to the main repository.

## 📄 License

MIT

## 🔗 Related Documentation

- [PACKAGES.md](./PACKAGES.md) - Detailed package integration guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture and design decisions
- [Main Repository](../) - nestjs-toolbox monorepo
