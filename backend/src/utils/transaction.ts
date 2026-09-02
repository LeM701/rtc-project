import { Pool, PoolClient } from 'pg';

// Both Pool and PoolClient expose .query() with the same signature,
// so repositories can accept either without knowing which one they got.
export type Queryable = Pool | PoolClient;

export async function withTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
