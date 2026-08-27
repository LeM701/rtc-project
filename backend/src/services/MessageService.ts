import { MessageRepository } from '../repositories/MessageRepository';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { PermissionService, roleAtLeast } from './PermissionService';
import { RealtimeGateway } from '../socket/RealtimeGateway';
import { AppError } from '../utils/AppError';
import { Message } from '../models/Message';

const MAX_CONTENT_LENGTH = 2000;

export class MessageService {
  private permissions: PermissionService;

  constructor(
    private messageRepository: MessageRepository,
    private channelRepository: ChannelRepository,
    memberRepository: ServerMemberRepository,
    private realtime?: RealtimeGateway // optional: tests and REST-only usage don't need it
  ) {
    this.permissions = new PermissionService(memberRepository);
  }

  async listMessages(channelId: number, userId: number): Promise<Message[]> {
    const channel = await this.findChannelOr404(channelId);
    await this.permissions.requireMembership(channel.serverId, userId);
    return this.messageRepository.listByChannel(channelId);
  }

  async sendMessage(channelId: number, userId: number, content: string): Promise<Message> {
    const channel = await this.findChannelOr404(channelId);
    await this.permissions.requireMembership(channel.serverId, userId);

    const trimmed = (content || '').trim();
    if (trimmed.length === 0) {
      throw new AppError(400, 'Le message ne peut pas être vide');
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      throw new AppError(400, `Le message ne peut pas dépasser ${MAX_CONTENT_LENGTH} caractères`);
    }

    const created = await this.messageRepository.create(channelId, userId, trimmed);
    this.realtime?.broadcastNewMessage(channelId, created);
    return created;
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) throw new AppError(404, 'Message introuvable');

    const channel = await this.findChannelOr404(message.channelId);
    const membership = await this.permissions.requireMembership(channel.serverId, userId);

    const isOwnMessage = message.authorId === userId;
    const isAdminOrOwner = roleAtLeast(membership.role, 'admin');

    if (!isOwnMessage && !isAdminOrOwner) {
      throw new AppError(403, 'Vous ne pouvez supprimer que vos propres messages');
    }

    await this.messageRepository.delete(messageId);
    this.realtime?.broadcastMessageDeleted(message.channelId, messageId);
  }

  private async findChannelOr404(channelId: number) {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) throw new AppError(404, 'Channel introuvable');
    return channel;
  }
}
