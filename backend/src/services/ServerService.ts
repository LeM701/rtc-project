import { Pool } from 'pg';
import { ServerRepository } from '../repositories/ServerRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { PermissionService } from './PermissionService';
import { withTransaction } from '../utils/transaction';
import { generateInviteCode } from '../utils/inviteCode';
import { AppError } from '../utils/AppError';
import { Server, ServerWithRole, ServerRole } from '../models/Server';

export class ServerService {
  private permissions: PermissionService;

  constructor(
    private pool: Pool,
    private serverRepository: ServerRepository,
    private memberRepository: ServerMemberRepository
  ) {
    this.permissions = new PermissionService(memberRepository);
  }

  async createServer(name: string, ownerId: number): Promise<Server> {
    if (!name || name.trim().length === 0 || name.length > 64) {
      throw new AppError(400, 'Le nom du serveur doit contenir entre 1 et 64 caractères');
    }

    // Two writes (server + owner membership) that must succeed or fail
    // together — if the second insert failed after the first committed,
    // we'd end up with an ownerless server. Hence the transaction.
    return withTransaction(this.pool, async (client) => {
      const server = await this.serverRepository.create(name.trim(), generateInviteCode(), client);
      await this.memberRepository.addMember(server.id, ownerId, 'owner', client);
      return server;
    });
  }

  async listMyServers(userId: number): Promise<ServerWithRole[]> {
    return this.memberRepository.listServersForUser(userId);
  }

  async getServer(serverId: number, userId: number): Promise<Server> {
    const server = await this.serverRepository.findById(serverId);
    if (!server) throw new AppError(404, 'Serveur introuvable');
    await this.permissions.requireMembership(serverId, userId);
    return server;
  }

  async updateServer(serverId: number, userId: number, name: string): Promise<Server> {
    await this.permissions.requireRole(serverId, userId, 'owner');

    if (!name || name.trim().length === 0 || name.length > 64) {
      throw new AppError(400, 'Le nom du serveur doit contenir entre 1 et 64 caractères');
    }

    const updated = await this.serverRepository.update(serverId, name.trim());
    if (!updated) throw new AppError(404, 'Serveur introuvable');
    return updated;
  }

  async deleteServer(serverId: number, userId: number): Promise<void> {
    await this.permissions.requireRole(serverId, userId, 'owner');
    await this.serverRepository.delete(serverId);
  }

  async joinServer(inviteCode: string, userId: number): Promise<Server> {
    const server = await this.serverRepository.findByInviteCode(inviteCode);
    if (!server) throw new AppError(404, "Code d'invitation invalide");

    const existing = await this.memberRepository.findMembership(server.id, userId);
    if (existing) throw new AppError(409, 'Vous êtes déjà membre de ce serveur');

    await this.memberRepository.addMember(server.id, userId, 'member');
    return server;
  }

  async leaveServer(serverId: number, userId: number): Promise<void> {
    const membership = await this.permissions.requireMembership(serverId, userId);

    if (membership.role === 'owner') {
      throw new AppError(403, "Le propriétaire ne peut pas quitter son propre serveur. Transférez la propriété ou supprimez le serveur.");
    }

    await this.memberRepository.removeMember(serverId, userId);
  }

  async listMembers(serverId: number, userId: number) {
    await this.permissions.requireMembership(serverId, userId); // must belong to the server to see who else is in it
    return this.memberRepository.listMembers(serverId);
  }

  async updateMemberRole(
    serverId: number,
    callerId: number,
    targetUserId: number,
    newRole: ServerRole
  ) {
    if (!['owner', 'admin', 'member'].includes(newRole)) {
      throw new AppError(400, 'Rôle invalide');
    }

    await this.permissions.requireRole(serverId, callerId, 'owner');

    if (targetUserId === callerId) {
      throw new AppError(400, 'Vous ne pouvez pas modifier votre propre rôle');
    }

    const target = await this.memberRepository.findMembership(serverId, targetUserId);
    if (!target) throw new AppError(404, "Cet utilisateur n'est pas membre de ce serveur");

    if (newRole === 'owner') {
      // Ownership transfer: two rows change at once, and a DB-level unique
      // index only allows one 'owner' row per server at any instant — so
      // the old owner MUST be demoted before the new one is promoted,
      // inside the same transaction, or Postgres rejects the second write.
      return withTransaction(this.pool, async (client) => {
        await this.memberRepository.updateRole(serverId, callerId, 'admin', client);
        return this.memberRepository.updateRole(serverId, targetUserId, 'owner', client);
      });
    }

    return this.memberRepository.updateRole(serverId, targetUserId, newRole);
  }
}
