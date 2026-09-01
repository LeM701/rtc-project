import request from 'supertest';
import { Pool } from 'pg';
import { Express } from 'express';
import { buildTestApp, resetDatabase } from './testApp';

describe('Server endpoints (integration)', () => {
  let app: Express;
  let db: Pool;

  beforeAll(() => { ({ app, db } = buildTestApp()); });
  beforeEach(async () => { await resetDatabase(db); });
  afterAll(async () => { await db.end(); });

  async function signupAgent(username: string) {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({ username, password: 'password123' });
    return agent;
  }

  it('creating a server makes the creator its Owner', async () => {
    const alice = await signupAgent('alice');
    const createRes = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    expect(createRes.status).toBe(201);
    const membersRes = await alice.get(`/api/servers/${createRes.body.id}/members`);
    expect(membersRes.status).toBe(200);
    expect(membersRes.body).toEqual([expect.objectContaining({ userId: expect.any(Number), role: 'owner' })]);
  });

  it('a second user can join via the invite code and appears as Member', async () => {
    const alice = await signupAgent('alice');
    const bob = await signupAgent('bob');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    const joinRes = await bob.post(`/api/servers/${server.body.inviteCode}/join`);
    expect(joinRes.status).toBe(200);
    const membersRes = await alice.get(`/api/servers/${server.body.id}/members`);
    const roles = membersRes.body.map((m: any) => m.role).sort();
    expect(roles).toEqual(['member', 'owner']);
  });

  it('rejects joining with an invalid invite code', async () => {
    const bob = await signupAgent('bob');
    const res = await bob.post('/api/servers/not-a-real-code/join');
    expect(res.status).toBe(404);
  });

  it('a non-owner cannot delete the server', async () => {
    const alice = await signupAgent('alice');
    const bob = await signupAgent('bob');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    await bob.post(`/api/servers/${server.body.inviteCode}/join`);
    const res = await bob.delete(`/api/servers/${server.body.id}`);
    expect(res.status).toBe(403);
  });

  it('the owner can delete the server', async () => {
    const alice = await signupAgent('alice');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    const res = await alice.delete(`/api/servers/${server.body.id}`);
    expect(res.status).toBe(204);
    const getRes = await alice.get(`/api/servers/${server.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it('the owner cannot leave their own server', async () => {
    const alice = await signupAgent('alice');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    const res = await alice.delete(`/api/servers/${server.body.id}/leave`);
    expect(res.status).toBe(403);
  });

  it('a regular member can leave the server', async () => {
    const alice = await signupAgent('alice');
    const bob = await signupAgent('bob');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    await bob.post(`/api/servers/${server.body.inviteCode}/join`);
    const res = await bob.delete(`/api/servers/${server.body.id}/leave`);
    expect(res.status).toBe(204);
  });

  it('the owner can promote a member to admin', async () => {
    const alice = await signupAgent('alice');
    const bob = await signupAgent('bob');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    await bob.post(`/api/servers/${server.body.inviteCode}/join`);
    const bobId = (await bob.get('/api/me')).body.id;
    const res = await alice.put(`/api/servers/${server.body.id}/members/${bobId}`).send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('a non-owner cannot change roles', async () => {
    const alice = await signupAgent('alice');
    const bob = await signupAgent('bob');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    await bob.post(`/api/servers/${server.body.inviteCode}/join`);
    const aliceId = (await alice.get('/api/me')).body.id;
    const res = await bob.put(`/api/servers/${server.body.id}/members/${aliceId}`).send({ role: 'member' });
    expect(res.status).toBe(403);
  });

  it('transferring ownership demotes the old owner and lets them stay in the server', async () => {
    const alice = await signupAgent('alice');
    const bob = await signupAgent('bob');
    const server = await alice.post('/api/servers').send({ name: 'Epitech Promo' });
    await bob.post(`/api/servers/${server.body.inviteCode}/join`);
    const bobId = (await bob.get('/api/me')).body.id;
    const transferRes = await alice.put(`/api/servers/${server.body.id}/members/${bobId}`).send({ role: 'owner' });
    expect(transferRes.status).toBe(200);
    const membersRes = await bob.get(`/api/servers/${server.body.id}/members`);
    const roles = membersRes.body.reduce((acc: any, m: any) => ({ ...acc, [m.userId]: m.role }), {});
    expect(roles[bobId]).toBe('owner');
    const deleteRes = await alice.delete(`/api/servers/${server.body.id}`);
    expect(deleteRes.status).toBe(403);
    const newOwnerDeleteRes = await bob.delete(`/api/servers/${server.body.id}`);
    expect(newOwnerDeleteRes.status).toBe(204);
  });
});
