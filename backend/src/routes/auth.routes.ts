import { Router } from 'express';
import { Pool } from 'pg';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { requireAuth } from '../middlewares/auth.middleware';

export function authRoutes(db: Pool): Router {
  const router = Router();

  const userRepository = new UserRepository(db);
  const authService = new AuthService(userRepository);
  const controller = new AuthController(authService);

  router.post('/auth/signup', controller.signup);
  router.post('/auth/login', controller.login);
  router.post('/auth/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
}
