import { Request, Response, NextFunction } from 'express';
import { ServerService } from '../services/ServerService';

export class ServerController {
  constructor(private serverService: ServerService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const server = await this.serverService.createServer(req.body.name, req.user!.userId);
      res.status(201).json(server);
    } catch (err) {
      next(err);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const servers = await this.serverService.listMyServers(req.user!.userId);
      res.json(servers);
    } catch (err) {
      next(err);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const server = await this.serverService.getServer(Number(req.params.id), req.user!.userId);
      res.json(server);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const server = await this.serverService.updateServer(
        Number(req.params.id),
        req.user!.userId,
        req.body.name
      );
      res.json(server);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.serverService.deleteServer(Number(req.params.id), req.user!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  join = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Subject spec: POST /servers/{id}/join. The joiner never has the
      // server's numeric database id — only the invite code from the
      // invitation link — so this {id} segment carries the invite code.
      const server = await this.serverService.joinServer(req.params.id, req.user!.userId);
      res.status(200).json(server);
    } catch (err) {
      next(err);
    }
  };

  leave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.serverService.leaveServer(Number(req.params.id), req.user!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await this.serverService.listMembers(Number(req.params.id), req.user!.userId);
      res.json(members);
    } catch (err) {
      next(err);
    }
  };

  updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await this.serverService.updateMemberRole(
        Number(req.params.id),
        req.user!.userId,
        Number(req.params.userId),
        req.body.role
      );
      res.json(member);
    } catch (err) {
      next(err);
    }
  };
}
