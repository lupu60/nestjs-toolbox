// E2E test setup file
// This runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_NAME = process.env.TEST_DATABASE_NAME || 'nestjs_toolbox_showcase_test';
process.env.LOG_LEVEL = 'error';
