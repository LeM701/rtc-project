import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { AppError } from '../utils/AppError';
import { ServerMember, ServerRole } from '../models/Server';

// Higher number = more privileges. Lets us express "at least Admin"
// as a single comparison instead of listing roles everywhere.
const ROLE_RANK: Record<ServerRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

// Exported so services with an "author OR Admin+" rule (e.g. deleting a
// message) can check role level without duplicating the rank table.
export function roleAtLeast(role: ServerRole, minRole: ServerRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export class PermissionService {
  constructor(private memberRepository: ServerMemberRepository) {}

  async requireMembership(serverId: number, userId: number): Promise<ServerMember> {
    const membership = await this.memberRepository.findMembership(serverId, userId);
    if (!membership) throw new AppError(403, "Vous n'êtes pas membre de ce serveur");
    return membership;
  }

  async requireRole(serverId: number, userId: number, minRole: ServerRole): Promise<ServerMember> {
    const membership = await this.requireMembership(serverId, userId);
    if (!roleAtLeast(membership.role, minRole)) {
      throw new AppError(403, `Action réservée aux rôles ${minRole} et supérieurs`);
    }
    return membership;
  }
}
