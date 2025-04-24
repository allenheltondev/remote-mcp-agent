import { neon } from '@neondatabase/serverless';

let sql: ReturnType<typeof neon>;

export function initialize(connectionString: string) {
  sql = neon(connectionString);
}

export function getDbClient() {
  if (!sql) {
    throw new Error('Database client not initialized');
  }
  return sql;
}

