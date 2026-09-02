import { Router } from 'express';
import { Pool } from 'pg';
import { ChannelController } from '../controllers/ChannelController';
import { ChannelService } from '../services/ChannelService';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { requireAuth } from '../middlewares/auth.middleware';

export function channelRoutes(db: Pool): Router {
  const router = Router();

  const channelRepository = new ChannelRepository(db);
  const memberRepository = new ServerMemberRepository(db);
  const channelService = new ChannelService(channelRepository, memberRepository);
  const controller = new ChannelController(channelService);

  router.use(requireAuth);

  router.post('/servers/:serverId/channels', controller.create);
  router.get('/servers/:serverId/channels', controller.list);
  router.get('/channels/:id', controller.getOne);
  router.put('/channels/:id', controller.update);
  router.delete('/channels/:id', controller.remove);

  return router;
}
