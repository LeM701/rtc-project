import { ChannelRepository } from '../repositories/ChannelRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { PermissionService } from './PermissionService';
import { AppError } from '../utils/AppError';
import { Channel } from '../models/Channel';

export class ChannelService {
  private permissions: PermissionService;

  constructor(
    private channelRepository: ChannelRepository,
    memberRepository: ServerMemberRepository
  ) {
    this.permissions = new PermissionService(memberRepository);
  }

  async listChannels(serverId: number, userId: number): Promise<Channel[]> {
    await this.permissions.requireMembership(serverId, userId);
    return this.channelRepository.listByServer(serverId);
  }

  async createChannel(serverId: number, userId: number, name: string): Promise<Channel> {
    await this.permissions.requireRole(serverId, userId, 'admin');
    this.validateName(name);
    return this.channelRepository.create(serverId, name.trim());
  }

  async getChannel(channelId: number, userId: number): Promise<Channel> {
    const channel = await this.findChannelOr404(channelId);
    await this.permissions.requireMembership(channel.serverId, userId);
    return channel;
  }

  async updateChannel(channelId: number, userId: number, name: string): Promise<Channel> {
    const channel = await this.findChannelOr404(channelId);
    await this.permissions.requireRole(channel.serverId, userId, 'admin');
    this.validateName(name);

    const updated = await this.channelRepository.update(channelId, name.trim());
    if (!updated) throw new AppError(404, 'Channel introuvable');
    return updated;
  }

  async deleteChannel(channelId: number, userId: number): Promise<void> {
    const channel = await this.findChannelOr404(channelId);
    await this.permissions.requireRole(channel.serverId, userId, 'admin');
    await this.channelRepository.delete(channelId);
  }

  private async findChannelOr404(channelId: number): Promise<Channel> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) throw new AppError(404, 'Channel introuvable');
    return channel;
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0 || name.length > 64) {
      throw new AppError(400, 'Le nom du channel doit contenir entre 1 et 64 caractères');
    }
  }
}
