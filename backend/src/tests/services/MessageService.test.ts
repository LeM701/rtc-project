import { MessageService } from '../../services/MessageService';
import { MessageRepository } from '../../repositories/MessageRepository';
import { ChannelRepository } from '../../repositories/ChannelRepository';
import { ServerMemberRepository } from '../../repositories/ServerMemberRepository';
import { Message } from '../../models/Message';
import { Channel } from '../../models/Channel';
import { ServerMember, ServerRole } from '../../models/Server';

class FakeMessageRepository {
  public messages: Message[] = [];
  private nextId = 1;

  async findById(id: number) {
    return this.messages.find((m) => m.id === id) || null;
  }
  async listByChannel(channelId: number) {
    return this.messages.filter((m) => m.channelId === channelId);
  }
  async create(channelId: number, authorId: number, content: string) {
    const message: Message = { id: this.nextId++, channelId, authorId, content, createdAt: new Date() };
    this.messages.push(message);
    return message;
  }
  async delete(id: number) {
    const before = this.messages.length;
    this.messages = this.messages.filter((m) => m.id !== id);
    return this.messages.length < before;
  }
}

class FakeChannelRepository {
  constructor(public channels: Channel[]) {}
  async findById(id: number) {
    return this.channels.find((c) => c.id === id) || null;
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

const SERVER_ID = 1;
const CHANNEL_ID = 1;

function buildService() {
  const messageRepo = new FakeMessageRepository();
  const channelRepo = new FakeChannelRepository([
    { id: CHANNEL_ID, serverId: SERVER_ID, name: 'general', createdAt: new Date() },
  ]);
  const memberRepo = new FakeServerMemberRepository();

  const service = new MessageService(
    messageRepo as unknown as MessageRepository,
    channelRepo as unknown as ChannelRepository,
    memberRepo as unknown as ServerMemberRepository
  );
  return { service, messageRepo, memberRepo };
}

describe('MessageService', () => {
  it('lets a member send a message', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');

    const message = await service.sendMessage(CHANNEL_ID, 10, 'hello world');
    expect(message.content).toBe('hello world');
    expect(message.authorId).toBe(10);
  });

  it('rejects an empty message', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');

    await expect(service.sendMessage(CHANNEL_ID, 10, '   ')).rejects.toThrow(
      'Le message ne peut pas être vide'
    );
  });

  it('rejects sending from someone not in the server', async () => {
    const { service } = buildService();
    await expect(service.sendMessage(CHANNEL_ID, 99, 'hi')).rejects.toThrow(
      "Vous n'êtes pas membre de ce serveur"
    );
  });

  it('lets a member delete their own message', async () => {
    const { service, memberRepo, messageRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');
    const message = await service.sendMessage(CHANNEL_ID, 10, 'hello');

    await service.deleteMessage(message.id, 10);
    expect(await messageRepo.findById(message.id)).toBeNull();
  });

  it('rejects a member deleting someone else\'s message', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');
    memberRepo.seed(SERVER_ID, 20, 'member');
    const message = await service.sendMessage(CHANNEL_ID, 10, 'hello');

    await expect(service.deleteMessage(message.id, 20)).rejects.toThrow(
      'Vous ne pouvez supprimer que vos propres messages'
    );
  });

  it('lets an Admin delete a message from another member', async () => {
    const { service, memberRepo, messageRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');
    memberRepo.seed(SERVER_ID, 20, 'admin');
    const message = await service.sendMessage(CHANNEL_ID, 10, 'hello');

    await service.deleteMessage(message.id, 20);
    expect(await messageRepo.findById(message.id)).toBeNull();
  });

  it('lets an Owner delete a message from another member', async () => {
    const { service, memberRepo, messageRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');
    memberRepo.seed(SERVER_ID, 30, 'owner');
    const message = await service.sendMessage(CHANNEL_ID, 10, 'hello');

    await service.deleteMessage(message.id, 30);
    expect(await messageRepo.findById(message.id)).toBeNull();
  });

  it('returns 404 for deleting a message that does not exist', async () => {
    const { service, memberRepo } = buildService();
    memberRepo.seed(SERVER_ID, 10, 'member');

    await expect(service.deleteMessage(999, 10)).rejects.toThrow('Message introuvable');
  });
});
