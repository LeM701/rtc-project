import { Pool } from 'pg';
import { env } from './env';

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(env.databaseUrl);

export function createPool(): Pool {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  return pool;
}
