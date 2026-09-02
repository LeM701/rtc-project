import { Router } from 'express';
import { Pool } from 'pg';
import { MessageController } from '../controllers/MessageController';
import { MessageService } from '../services/MessageService';
import { MessageRepository } from '../repositories/MessageRepository';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { RealtimeGateway } from '../socket/RealtimeGateway';
import { requireAuth } from '../middlewares/auth.middleware';

export function messageRoutes(db: Pool, realtime?: RealtimeGateway): Router {
  const router = Router();

  const messageRepository = new MessageRepository(db);
  const channelRepository = new ChannelRepository(db);
  const memberRepository = new ServerMemberRepository(db);
  const messageService = new MessageService(messageRepository, channelRepository, memberRepository, realtime);
  const controller = new MessageController(messageService);

  router.use(requireAuth);

  router.post('/channels/:id/messages', controller.send);
  router.get('/channels/:id/messages', controller.list);
  router.delete('/messages/:id', controller.remove);

  return router;
}
