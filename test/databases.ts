import { DataSource, type DataSourceOptions, type EntitySchema, type MixedList } from 'typeorm';

// Databases the TypeORM integration suites run against.
// sql.js (in-memory SQLite) always runs. PostgreSQL runs when TEST_PG_URL is set
// (CI e2e job, or locally: docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine).

// biome-ignore lint/complexity/noBannedTypes: mirrors TypeORM's own entities option type
type Entities = MixedList<Function | string | EntitySchema>;

export type TestDatabase = {
  name: 'sqljs' | 'postgres';
  // Returns an initialized data source with a freshly synchronized, empty schema
  initialize: (entities: Entities) => Promise<DataSource>;
};

export const TEST_PG_URL = process.env.TEST_PG_URL;

export const sqljs: TestDatabase = {
  name: 'sqljs',
  initialize: (entities) => new DataSource({ type: 'sqljs', synchronize: true, entities }).initialize(),
};

// Each suite gets its own schema so packages can run in parallel against one database
export const postgres = (schema: string): TestDatabase => ({
  name: 'postgres',
  initialize: async (entities) => {
    const options: DataSourceOptions = { type: 'postgres', url: TEST_PG_URL, schema, entities };
    const dataSource = await new DataSource(options).initialize();
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await dataSource.synchronize(true);
    return dataSource;
  },
});

export const testDatabases = (schema: string): TestDatabase[] => (TEST_PG_URL ? [sqljs, postgres(schema)] : [sqljs]);
