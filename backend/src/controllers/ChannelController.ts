import { Request, Response, NextFunction } from 'express';
import { ChannelService } from '../services/ChannelService';

export class ChannelController {
  constructor(private channelService: ChannelService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channels = await this.channelService.listChannels(
        Number(req.params.serverId),
        req.user!.userId
      );
      res.json(channels);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = await this.channelService.createChannel(
        Number(req.params.serverId),
        req.user!.userId,
        req.body.name
      );
      res.status(201).json(channel);
    } catch (err) {
      next(err);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = await this.channelService.getChannel(Number(req.params.id), req.user!.userId);
      res.json(channel);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = await this.channelService.updateChannel(
        Number(req.params.id),
        req.user!.userId,
        req.body.name
      );
      res.json(channel);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.channelService.deleteChannel(Number(req.params.id), req.user!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
