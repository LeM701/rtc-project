import request from 'supertest';
import { Pool } from 'pg';
import { Express } from 'express';
import { buildTestApp, resetDatabase } from './testApp';

describe('Auth endpoints (integration)', () => {
  let app: Express;
  let db: Pool;

  beforeAll(() => {
    ({ app, db } = buildTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await db.end();
  });

  it('POST /api/auth/signup creates a user and sets a session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'alice', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe('alice');
    expect(res.body.passwordHash).toBeUndefined(); // never leak the hash
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/signup rejects a duplicate username', async () => {
    await request(app).post('/api/auth/signup').send({ username: 'alice', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'alice', password: 'other-password' });

    expect(res.status).toBe(409);
  });

  it('POST /api/auth/login authenticates with correct credentials', async () => {
    await request(app).post('/api/auth/signup').send({ username: 'alice', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });

  it('POST /api/auth/login rejects a wrong password', async () => {
    await request(app).post('/api/auth/signup').send({ username: 'alice', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('GET /api/me returns 401 without a session', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/me returns the current user when logged in', async () => {
    const agent = request.agent(app); // keeps cookies across requests automatically
    await agent.post('/api/auth/signup').send({ username: 'alice', password: 'password123' });

    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });

  it('POST /api/auth/logout clears the session so /api/me becomes unauthorized again', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({ username: 'alice', password: 'password123' });

    await agent.post('/api/auth/logout');
    const res = await agent.get('/api/me');

    expect(res.status).toBe(401);
  });
});
