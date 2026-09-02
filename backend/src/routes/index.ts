import { Router } from 'express';
import { Pool } from 'pg';
import { authRoutes } from './auth.routes';
import { serverRoutes } from './server.routes';
import { channelRoutes } from './channel.routes';
import { messageRoutes } from './message.routes';
import { RealtimeGateway } from '../socket/RealtimeGateway';

export function createRoutes(db: Pool, realtime?: RealtimeGateway): Router {
  const router = Router();

  router.use(authRoutes(db));
  router.use(serverRoutes(db));
  router.use(channelRoutes(db));
  router.use(messageRoutes(db, realtime));

  return router;
}
