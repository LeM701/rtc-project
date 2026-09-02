import { ChannelService } from '../../services/ChannelService';
import { ChannelRepository } from '../../repositories/ChannelRepository';
import { ServerMemberRepository } from '../../repositories/ServerMemberRepository';
import { Channel } from '../../models/Channel';
import { ServerMember, ServerRole } from '../../models/Server';

class FakeChannelRepository {
  public channels: Channel[] = [];
  private nextId = 1;

  async findById(id: number) {
    return this.channels.find((c) => c.id === id) || null;
  }
  async listByServer(serverId: number) {
    return this.channels.filter((c) => c.serverId === serverId);
  }
  async create(serverId: number, name: string) {
    const channel: Channel = { id: this.nextId++, serverId, name, createdAt: new Date() };
    this.channels.push(channel);
    return channel;
  }
  async update(id: number, name: string) {
    const channel = this.channels.find((c) => c.id === id);
    if (!channel) return null;
    channel.name = name;
    return channel;
  }
  async delete(id: number) {
    const before = this.channels.length;
    this.channels = this.channels.filter((c) => c.id !== id);
    return this.channels.length < before;
  }
}

class FakeServerMemberRepository {
  public members: ServerMember[] = [];

  async findMembership(serverId: number, userId: number) {
    return this.members.find((m) => m.serverId === serverId && m.userId === userId) || null;
  }
  seed(serverId: number, userId: number, role: ServerRole) {
    this.members.push({ serverId, userId, role, joinedAt: new Date() });
  }
}

function buildService() {
  const channelRepo = new FakeChannelRepository();
  const memberRepo = new FakeServerMemberRepository();
  const service = new ChannelService(
    channelRepo as unknown as ChannelRepository,
    memberRepo as unknown as ServerMemberRepository
  );
  return { service, channelRepo, memberRepo };
}

const SERVER_ID = 1;

describe('ChannelService', () => {
  it('lets an Admin create a channel', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'admin');

    const channel = await service.createChannel(SERVER_ID, 10, 'general');
    expect(channel.name).toBe('general');
  });

  it('lets an Owner create a channel', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'owner');

    const channel = await service.createChannel(SERVER_ID, 10, 'general');
    expect(channel.serverId).toBe(SERVER_ID);
  });

  it('rejects a Member trying to create a channel', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 20, 'member');

    await expect(service.createChannel(SERVER_ID, 20, 'general')).rejects.toThrow(
      'Action réservée aux rôles admin et supérieurs'
    );
  });

  it('rejects someone who is not even a member of the server', async () => {
    const { service } = buildService();
    await expect(service.createChannel(SERVER_ID, 99, 'general')).rejects.toThrow(
      "Vous n'êtes pas membre de ce serveur"
    );
  });

  it('lets any member list channels', async () => {
    const { service, memberRepo, channelRepo } = buildService();
    memberRepo.seed(SERVER_ID, 20, 'member');
    channelRepo.channels.push({ id: 1, serverId: SERVER_ID, name: 'general', createdAt: new Date() });

    const channels = await service.listChannels(SERVER_ID, 20);
    expect(channels).toHaveLength(1);
  });

  it('rejects a Member trying to delete a channel', async () => {
    const { service, memberRepo, channelRepo } = buildService();
    memberRepo.seed(SERVER_ID, 20, 'member');
    const channel = await channelRepo.create(SERVER_ID, 'general');

    await expect(service.deleteChannel(channel.id, 20)).rejects.toThrow(
      'Action réservée aux rôles admin et supérieurs'
    );
  });

  it('returns 404 for a channel that does not exist', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'admin');

    await expect(service.getChannel(999, 10)).rejects.toThrow('Channel introuvable');
  });
});
