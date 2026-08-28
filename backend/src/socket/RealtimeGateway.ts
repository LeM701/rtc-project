import { Message } from '../models/Message';

export interface RealtimeGateway {
  broadcastNewMessage(channelId: number, message: Message): void;
  broadcastMessageDeleted(channelId: number, messageId: number): void;
}
