import http from 'http';
import { createPool } from './config/database';
import { createBaseApp, attachRoutes } from './app';
import { ChatSocketServer } from './socket/chat.socket';
import { env } from './config/env';

const db = createPool();
const app = createBaseApp();
const server = http.createServer(app);

// Socket.IO attaches to the same HTTP server (one port, no separate ws
// server to manage). It implements RealtimeGateway so MessageService can
// broadcast through it without importing socket.io itself.
const chatSocketServer = new ChatSocketServer(server, db);

attachRoutes(app, db, chatSocketServer);

server.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
