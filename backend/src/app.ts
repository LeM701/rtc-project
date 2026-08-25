import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { env } from './config/env';
import { createRoutes } from './routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { RealtimeGateway } from './socket/RealtimeGateway';

// Split in two so index.ts can create the HTTP server (needed by Socket.IO)
// from the app *before* routes exist, then attach routes once the socket
// gateway is ready. Tests that don't need sockets just call createApp().
export function createBaseApp(): Express {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', environment: env.nodeEnv });
  });

  return app;
}

export function attachRoutes(app: Express, db: Pool, realtime?: RealtimeGateway): void {
  app.use('/api', createRoutes(db, realtime));

  // Must be registered last: Express only routes errors here if every
  // controller calls next(err) instead of handling it itself.
  app.use(errorMiddleware);
}

export function createApp(db: Pool, realtime?: RealtimeGateway): Express {
  const app = createBaseApp();
  attachRoutes(app, db, realtime);
  return app;
}
