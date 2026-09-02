import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createBaseApp, attachRoutes } from '../../app';
import { ChatSocketServer } from '../../socket/chat.socket';
import { createPool } from '../../config/database';
import { resetDatabase } from './testApp';

interface TestSocketServer {
  app: Express;
  db: Pool;
  httpServer: http.Server;
  port: number;
  close: () => Promise<void>;
}

async function buildTestSocketServer(): Promise<TestSocketServer> {
  const db = createPool();
  const app = createBaseApp();
  const httpServer = http.createServer(app);
  const chatSocketServer = new ChatSocketServer(httpServer, db);
  attachRoutes(app, db, chatSocketServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  return {
    app, db, httpServer, port,
    close: () => new Promise<void>((resolve, reject) => { httpServer.close((err) => (err ? reject(err) : resolve())); }),
  };
}

async function signupAndGetCookie(app: Express, username: string): Promise<{ cookieHeader: string; userId: number }> {
  const res = await request(app).post('/api/auth/signup').send({ username, password: 'password123' });
  const setCookie = res.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
  return { cookieHeader, userId: res.body.id };
}

function connectSocket(port: number, cookieHeader: string): ClientSocket {
  return ioClient(`http://localhost:${port}`, { extraHeaders: { Cookie: cookieHeader }, transports: ['websocket'], forceNew: true });
}

function waitForEvent<T = any>(socket: ClientSocket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });
}

function joinAndWaitForAck(socket: ClientSocket, event: string, payload: unknown, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ack on "${event}"`)), timeoutMs);
    socket.emit(event, payload, () => { clearTimeout(timer); resolve(); });
  });
}

describe('WebSocket (integration)', () => {
  let server: TestSocketServer;
  const openSockets: ClientSocket[] = [];

  beforeAll(async () => { server = await buildTestSocketServer(); });
  afterAll(async () => { await server.db.end(); await server.close(); });
  beforeEach(async () => { await resetDatabase(server.db); });
  afterEach(() => { for (const s of openSockets) s.disconnect(); openSockets.length = 0; });

  async function setupServerWithMember() {
    const owner = await signupAndGetCookie(server.app, 'alice');
    const member = await signupAndGetCookie(server.app, 'bob');
    const createRes = await request(server.app).post('/api/servers').set('Cookie', owner.cookieHeader).send({ name: 'Epitech Promo' });
    const inviteCode = createRes.body.inviteCode;
    const serverId = createRes.body.id;
    await request(server.app).post(`/api/servers/${inviteCode}/join`).set('Cookie', member.cookieHeader);
    const channelRes = await request(server.app).post(`/api/servers/${serverId}/channels`).set('Cookie', owner.cookieHeader).send({ name: 'general' });
    return { owner, member, serverId, channelId: channelRes.body.id as number };
  }

  it('rejects a socket connection without a valid session cookie', async () => {
    const socket = connectSocket(server.port, 'token=not-a-real-token');
    openSockets.push(socket);
    const err = await waitForEvent<Error>(socket, 'connect_error');
    expect(err.message).toMatch(/Session invalide|Non authentifié/);
  });

  it('accepts a socket connection with a valid session cookie', async () => {
    const { cookieHeader } = await signupAndGetCookie(server.app, 'alice');
    const socket = connectSocket(server.port, cookieHeader);
    openSockets.push(socket);
    await waitForEvent(socket, 'connect');
    expect(socket.connected).toBe(true);
  });

  it('lets a member join their server room, and denies a non-member', async () => {
    const { member, serverId } = await setupServerWithMember();
    const stranger = await signupAndGetCookie(server.app, 'carol');
    const memberSocket = connectSocket(server.port, member.cookieHeader);
    openSockets.push(memberSocket);
    await waitForEvent(memberSocket, 'connect');
    memberSocket.emit('server:join', { serverId });
    const presence = await waitForEvent<{ onlineUserIds: number[] }>(memberSocket, 'presence:update');
    expect(presence.onlineUserIds).toContain(member.userId);

    const strangerSocket = connectSocket(server.port, stranger.cookieHeader);
    openSockets.push(strangerSocket);
    await waitForEvent(strangerSocket, 'connect');
    strangerSocket.emit('server:join', { serverId });
    const errorPayload = await waitForEvent<{ message: string }>(strangerSocket, 'error');
    expect(errorPayload.message).toMatch(/pas membre/);
  });

  it('broadcasts message:new to everyone in the channel when a message is sent via REST', async () => {
    const { owner, member, channelId } = await setupServerWithMember();
    const ownerSocket = connectSocket(server.port, owner.cookieHeader);
    const memberSocket = connectSocket(server.port, member.cookieHeader);
    openSockets.push(ownerSocket, memberSocket);
    await Promise.all([waitForEvent(ownerSocket, 'connect'), waitForEvent(memberSocket, 'connect')]);
    await Promise.all([
      joinAndWaitForAck(ownerSocket, 'channel:join', { channelId }),
      joinAndWaitForAck(memberSocket, 'channel:join', { channelId }),
    ]);
    const receivedByMember = waitForEvent<{ content: string }>(memberSocket, 'message:new');
    await request(server.app).post(`/api/channels/${channelId}/messages`).set('Cookie', owner.cookieHeader).send({ content: 'hello from REST' });
    const message = await receivedByMember;
    expect(message.content).toBe('hello from REST');
  });

  it('broadcasts message:new to everyone when a message is sent via the socket', async () => {
    const { owner, member, channelId } = await setupServerWithMember();
    const ownerSocket = connectSocket(server.port, owner.cookieHeader);
    const memberSocket = connectSocket(server.port, member.cookieHeader);
    openSockets.push(ownerSocket, memberSocket);
    await Promise.all([waitForEvent(ownerSocket, 'connect'), waitForEvent(memberSocket, 'connect')]);
    await Promise.all([
      joinAndWaitForAck(ownerSocket, 'channel:join', { channelId }),
      joinAndWaitForAck(memberSocket, 'channel:join', { channelId }),
    ]);
    const receivedByMember = waitForEvent<{ content: string }>(memberSocket, 'message:new');
    const receivedByOwner = waitForEvent<{ content: string }>(ownerSocket, 'message:new');
    const sentMessage = await new Promise<{ content: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for message:send ack')), 4000);
      ownerSocket.emit('message:send', { channelId, content: 'hello via socket' }, (message: any) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
    expect(sentMessage.content).toBe('hello via socket');
    expect((await receivedByMember).content).toBe('hello via socket');
    expect((await receivedByOwner).content).toBe('hello via socket');
  });

  it('rejects an empty message sent via the socket with an error event', async () => {
    const { owner, channelId } = await setupServerWithMember();
    const ownerSocket = connectSocket(server.port, owner.cookieHeader);
    openSockets.push(ownerSocket);
    await waitForEvent(ownerSocket, 'connect');
    await joinAndWaitForAck(ownerSocket, 'channel:join', { channelId });
    const errorEvent = waitForEvent<{ message: string }>(ownerSocket, 'error');
    ownerSocket.emit('message:send', { channelId, content: '   ' });
    const payload = await errorEvent;
    expect(payload.message).toMatch(/vide/);
  });

  it('broadcasts message:deleted to the channel when a message is deleted via REST', async () => {
    const { owner, member, channelId } = await setupServerWithMember();
    const sendRes = await request(server.app).post(`/api/channels/${channelId}/messages`).set('Cookie', owner.cookieHeader).send({ content: 'to be deleted' });
    const memberSocket = connectSocket(server.port, member.cookieHeader);
    openSockets.push(memberSocket);
    await waitForEvent(memberSocket, 'connect');
    await joinAndWaitForAck(memberSocket, 'channel:join', { channelId });
    const deletedEvent = waitForEvent<{ messageId: number }>(memberSocket, 'message:deleted');
    await request(server.app).delete(`/api/messages/${sendRes.body.id}`).set('Cookie', owner.cookieHeader);
    const payload = await deletedEvent;
    expect(payload.messageId).toBe(sendRes.body.id);
  });

  it('broadcasts typing:update to other members but not back to the sender', async () => {
    const { owner, member, channelId } = await setupServerWithMember();
    const ownerSocket = connectSocket(server.port, owner.cookieHeader);
    const memberSocket = connectSocket(server.port, member.cookieHeader);
    openSockets.push(ownerSocket, memberSocket);
    await Promise.all([waitForEvent(ownerSocket, 'connect'), waitForEvent(memberSocket, 'connect')]);
    await Promise.all([
      joinAndWaitForAck(ownerSocket, 'channel:join', { channelId }),
      joinAndWaitForAck(memberSocket, 'channel:join', { channelId }),
    ]);
    let ownerReceivedOwnTyping = false;
    ownerSocket.once('typing:update', () => { ownerReceivedOwnTyping = true; });
    const memberTypingEvent = waitForEvent<{ userId: number; isTyping: boolean }>(memberSocket, 'typing:update');
    ownerSocket.emit('typing:start', { channelId });
    const payload = await memberTypingEvent;
    expect(payload.userId).toBe(owner.userId);
    expect(payload.isTyping).toBe(true);
    expect(ownerReceivedOwnTyping).toBe(false);
  });

  it('updates presence when a member disconnects', async () => {
    const { owner, member, serverId } = await setupServerWithMember();
    const ownerSocket = connectSocket(server.port, owner.cookieHeader);
    const memberSocket = connectSocket(server.port, member.cookieHeader);
    openSockets.push(ownerSocket, memberSocket);
    await Promise.all([waitForEvent(ownerSocket, 'connect'), waitForEvent(memberSocket, 'connect')]);
    ownerSocket.emit('server:join', { serverId });
    await waitForEvent(ownerSocket, 'presence:update');
    memberSocket.emit('server:join', { serverId });
    const afterMemberJoined = await waitForEvent<{ onlineUserIds: number[] }>(ownerSocket, 'presence:update');
    expect(afterMemberJoined.onlineUserIds).toContain(member.userId);
    const afterMemberLeft = waitForEvent<{ onlineUserIds: number[] }>(ownerSocket, 'presence:update');
    memberSocket.disconnect();
    const finalPresence = await afterMemberLeft;
    expect(finalPresence.onlineUserIds).not.toContain(member.userId);
  });
});
