import { Pool } from 'pg';
import { env } from './env';

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(env.databaseUrl);

export function createPool(): Pool {
  return new Pool({
    connectionString: env.databaseUrl,
    // Supabase requires SSL even in local dev; a local Postgres (used for
    // integration tests / local development) usually doesn't have it enabled.
    ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
  });
}
