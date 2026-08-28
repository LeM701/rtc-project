import { Pool } from 'pg';
import { createApp } from '../../app';
import { createPool } from '../../config/database';

export function buildTestApp() {
  const db = createPool();
  const app = createApp(db); // no realtime gateway needed for HTTP-only integration tests
  return { app, db };
}

export async function resetDatabase(db: Pool): Promise<void> {
  await db.query('TRUNCATE messages, channels, server_members, servers, users RESTART IDENTITY CASCADE');
}
