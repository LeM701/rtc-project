import { ServerService } from '../../services/ServerService';
import { ServerRepository } from '../../repositories/ServerRepository';
import { ServerMemberRepository } from '../../repositories/ServerMemberRepository';
import { Server, ServerMember, ServerRole } from '../../models/Server';

// Fakes reproduce just enough behaviour of the real repositories to exercise
// ServerService's business rules, without touching Postgres or transactions.
class FakeServerRepository {
  public servers: Server[] = [];
  private nextId = 1;

  async findById(id: number) {
    return this.servers.find((s) => s.id === id) || null;
  }
  async findByInviteCode(code: string) {
    return this.servers.find((s) => s.inviteCode === code) || null;
  }
  async create(name: string, inviteCode: string) {
    const server: Server = { id: this.nextId++, name, inviteCode, createdAt: new Date() };
    this.servers.push(server);
    return server;
  }
  async update(id: number, name: string) {
    const server = this.servers.find((s) => s.id === id);
    if (!server) return null;
    server.name = name;
    return server;
  }
  async delete(id: number) {
    const before = this.servers.length;
    this.servers = this.servers.filter((s) => s.id !== id);
    return this.servers.length < before;
  }
}

class FakeServerMemberRepository {
  public members: ServerMember[] = [];

  async addMember(serverId: number, userId: number, role: ServerRole) {
    const member: ServerMember = { serverId, userId, role, joinedAt: new Date() };
    this.members.push(member);
    return member;
  }
  async findMembership(serverId: number, userId: number) {
    return this.members.find((m) => m.serverId === serverId && m.userId === userId) || null;
  }
  async removeMember(serverId: number, userId: number) {
    const before = this.members.length;
    this.members = this.members.filter((m) => !(m.serverId === serverId && m.userId === userId));
    return this.members.length < before;
  }
  async listMembers(serverId: number) {
    return this.members.filter((m) => m.serverId === serverId);
  }
  async updateRole(serverId: number, userId: number, role: ServerRole) {
    const member = this.members.find((m) => m.serverId === serverId && m.userId === userId);
    if (!member) return null;
    member.role = role;
    return member;
  }
  async listServersForUser(userId: number) {
    return [];
  }
}

function buildService() {
  const serverRepo = new FakeServerRepository();
  const memberRepo = new FakeServerMemberRepository();
  // ServerService only uses `pool` for withTransaction; we bypass real
  // transactions here by faking it away isn't needed because withTransaction
  // is only exercised indirectly through createServer below via a stub pool.
  const fakePool = {
    connect: async () => ({
      query: async (sql: string) => ({ rows: [], rowCount: 0 }),
      release: () => {},
    }),
  } as any;

  const service = new ServerService(
    fakePool,
    serverRepo as unknown as ServerRepository,
    memberRepo as unknown as ServerMemberRepository
  );
  return { service, serverRepo, memberRepo };
}

describe('ServerService', () => {
  it('creates a server and makes the creator the owner', async () => {
    const { service, memberRepo } = buildService();
    const server = await service.createServer('My Server', 1);

    const membership = await memberRepo.findMembership(server.id, 1);
    expect(membership?.role).toBe('owner');
  });

  it('rejects an empty server name', async () => {
    const { service } = buildService();
    await expect(service.createServer('  ', 1)).rejects.toThrow();
  });

  it('lets a member join via a valid invite code', async () => {
    const { service, memberRepo } = buildService();
    const server = await service.createServer('My Server', 1);

    const joined = await service.joinServer(server.inviteCode, 2);
    expect(joined.id).toBe(server.id);

    const membership = await memberRepo.findMembership(server.id, 2);
    expect(membership?.role).toBe('member');
  });

  it('rejects joining with an invalid invite code', async () => {
    const { service } = buildService();
    await expect(service.joinServer('does-not-exist', 2)).rejects.toThrow("Code d'invitation invalide");
  });

  it('rejects a non-owner trying to delete the server', async () => {
    const { service } = buildService();
    const server = await service.createServer('My Server', 1);
    await service.joinServer(server.inviteCode, 2);

    await expect(service.deleteServer(server.id, 2)).rejects.toThrow('Action réservée aux rôles owner et supérieurs');
  });

  it('prevents the owner from leaving their own server', async () => {
    const { service } = buildService();
    const server = await service.createServer('My Server', 1);

    await expect(service.leaveServer(server.id, 1)).rejects.toThrow(
      'Le propriétaire ne peut pas quitter son propre serveur. Transférez la propriété ou supprimez le serveur.'
    );
  });

  it('returns 404 (not 403) when getting a server that does not exist, even for a non-member', async () => {
    const { service } = buildService();
    await expect(service.getServer(999, 42)).rejects.toThrow('Serveur introuvable');
  });

  it('lets a regular member leave the server', async () => {
    const { service, memberRepo } = buildService();
    const server = await service.createServer('My Server', 1);
    await service.joinServer(server.inviteCode, 2);

    await service.leaveServer(server.id, 2);
    expect(await memberRepo.findMembership(server.id, 2)).toBeNull();
  });

  it('lets the owner promote a member to admin', async () => {
    const { service, memberRepo } = buildService();
    const server = await service.createServer('My Server', 1);
    await service.joinServer(server.inviteCode, 2);

    await service.updateMemberRole(server.id, 1, 2, 'admin');
    const membership = await memberRepo.findMembership(server.id, 2);
    expect(membership?.role).toBe('admin');
  });

  it('rejects a non-owner trying to change roles', async () => {
    const { service } = buildService();
    const server = await service.createServer('My Server', 1);
    await service.joinServer(server.inviteCode, 2);
    await service.joinServer(server.inviteCode, 3);

    await expect(service.updateMemberRole(server.id, 2, 3, 'admin')).rejects.toThrow(
      'Action réservée aux rôles owner et supérieurs'
    );
  });

  it('rejects the owner trying to change their own role', async () => {
    const { service } = buildService();
    const server = await service.createServer('My Server', 1);

    await expect(service.updateMemberRole(server.id, 1, 1, 'admin')).rejects.toThrow(
      'Vous ne pouvez pas modifier votre propre rôle'
    );
  });

  it('transfers ownership: new owner promoted, old owner demoted to admin, never two owners at once', async () => {
    const { service, memberRepo } = buildService();
    const server = await service.createServer('My Server', 1);
    await service.joinServer(server.inviteCode, 2);

    await service.updateMemberRole(server.id, 1, 2, 'owner');

    const newOwner = await memberRepo.findMembership(server.id, 2);
    const oldOwner = await memberRepo.findMembership(server.id, 1);
    expect(newOwner?.role).toBe('owner');
    expect(oldOwner?.role).toBe('admin');

    const owners = memberRepo.members.filter((m) => m.serverId === server.id && m.role === 'owner');
    expect(owners).toHaveLength(1);
  });

  it('rejects setting a role that does not exist', async () => {
    const { service } = buildService();
    const server = await service.createServer('My Server', 1);
    await service.joinServer(server.inviteCode, 2);

    await expect(service.updateMemberRole(server.id, 1, 2, 'superadmin' as any)).rejects.toThrow(
      'Rôle invalide'
    );
  });
});
