import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
};

export class AuthController {
  constructor(private authService: AuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await this.authService.signup(username, password);
      res.cookie('token', result.token, COOKIE_OPTIONS);
      res.status(201).json(result.user);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const result = await this.authService.login(username, password);
      res.cookie('token', result.token, COOKIE_OPTIONS);
      res.json(result.user);
    } catch (err) {
      next(err);
    }
  };

  logout = async (_req: Request, res: Response) => {
    res.clearCookie('token');
    res.status(204).send();
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authService.getCurrentUser(req.user!.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  };
}
