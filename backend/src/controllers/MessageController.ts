import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/MessageService';

export class MessageController {
  constructor(private messageService: MessageService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messages = await this.messageService.listMessages(Number(req.params.id), req.user!.userId);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  };

  send = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await this.messageService.sendMessage(
        Number(req.params.id),
        req.user!.userId,
        req.body.content
      );
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.messageService.deleteMessage(Number(req.params.id), req.user!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
