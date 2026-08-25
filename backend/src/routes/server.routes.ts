import { Router } from 'express';
import { Pool } from 'pg';
import { ServerController } from '../controllers/ServerController';
import { ServerService } from '../services/ServerService';
import { ServerRepository } from '../repositories/ServerRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { requireAuth } from '../middlewares/auth.middleware';

export function serverRoutes(db: Pool): Router {
  const router = Router();

  const serverRepository = new ServerRepository(db);
  const memberRepository = new ServerMemberRepository(db);
  const serverService = new ServerService(db, serverRepository, memberRepository);
  const controller = new ServerController(serverService);

  router.use(requireAuth); // every server route requires a logged-in user

  router.post('/servers', controller.create);
  router.get('/servers', controller.listMine);
  router.get('/servers/:id', controller.getOne);
  router.put('/servers/:id', controller.update);
  router.delete('/servers/:id', controller.remove);
  router.post('/servers/:id/join', controller.join);
  router.delete('/servers/:id/leave', controller.leave);
  router.get('/servers/:id/members', controller.listMembers);
  router.put('/servers/:id/members/:userId', controller.updateMemberRole);

  return router;
}
