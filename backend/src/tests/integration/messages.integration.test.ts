import request from 'supertest';
import { Pool } from 'pg';
import { Express } from 'express';
import { buildTestApp, resetDatabase } from './testApp';

describe('Channel and Message endpoints (integration)', () => {
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

  async function signupAgent(username: string) {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({ username, password: 'password123' });
    return agent;
  }

  async function setupServerWithMember() {
    const owner = await signupAgent('alice');
    const member = await signupAgent('bob');

    const server = await owner.post('/api/servers').send({ name: 'Epitech Promo' });
    await member.post(`/api/servers/${server.body.inviteCode}/join`);

    return { owner, member, serverId: server.body.id };
  }

  it('the owner (Admin+) can create a channel', async () => {
    const { owner, serverId } = await setupServerWithMember();

    const res = await owner.post(`/api/servers/${serverId}/channels`).send({ name: 'general' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('general');
  });

  it('a regular Member cannot create a channel', async () => {
    const { member, serverId } = await setupServerWithMember();

    const res = await member.post(`/api/servers/${serverId}/channels`).send({ name: 'general' });
    expect(res.status).toBe(403);
  });

  it('a Member can list channels and send a message', async () => {
    const { owner, member, serverId } = await setupServerWithMember();
    const channel = await owner.post(`/api/servers/${serverId}/channels`).send({ name: 'general' });

    const listRes = await member.get(`/api/servers/${serverId}/channels`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const sendRes = await member.post(`/api/channels/${channel.body.id}/messages`).send({
      content: 'hello everyone',
    });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.content).toBe('hello everyone');
  });

  it('a Member can delete their own message but not someone else\'s', async () => {
    const { owner, member, serverId } = await setupServerWithMember();
    const channel = await owner.post(`/api/servers/${serverId}/channels`).send({ name: 'general' });

    const ownMessage = await member.post(`/api/channels/${channel.body.id}/messages`).send({
      content: 'my message',
    });
    const ownerMessage = await owner.post(`/api/channels/${channel.body.id}/messages`).send({
      content: 'owner message',
    });

    const forbiddenRes = await member.delete(`/api/messages/${ownerMessage.body.id}`);
    expect(forbiddenRes.status).toBe(403);

    const allowedRes = await member.delete(`/api/messages/${ownMessage.body.id}`);
    expect(allowedRes.status).toBe(204);
  });

  it('the Owner can delete a message from another member', async () => {
    const { owner, member, serverId } = await setupServerWithMember();
    const channel = await owner.post(`/api/servers/${serverId}/channels`).send({ name: 'general' });

    const memberMessage = await member.post(`/api/channels/${channel.body.id}/messages`).send({
      content: 'my message',
    });

    const res = await owner.delete(`/api/messages/${memberMessage.body.id}`);
    expect(res.status).toBe(204);
  });

  it('message history is returned in chronological order', async () => {
    const { owner, member, serverId } = await setupServerWithMember();
    const channel = await owner.post(`/api/servers/${serverId}/channels`).send({ name: 'general' });

    await member.post(`/api/channels/${channel.body.id}/messages`).send({ content: 'first' });
    await member.post(`/api/channels/${channel.body.id}/messages`).send({ content: 'second' });

    const res = await owner.get(`/api/channels/${channel.body.id}/messages`);
    expect(res.status).toBe(200);
    expect(res.body.map((m: any) => m.content)).toEqual(['first', 'second']);
  });
});
