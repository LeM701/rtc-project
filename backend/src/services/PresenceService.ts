// A user can have several tabs/devices open, so we count connections
// per user rather than treating "one disconnect" as "user went offline".
export class PresenceService {
  private connectionCounts = new Map<number, number>();
  private serverUsers = new Map<number, Set<number>>();

  /** Call when a socket connects. */
  registerConnection(userId: number): void {
    this.connectionCounts.set(userId, (this.connectionCounts.get(userId) || 0) + 1);
  }

  /**
   * Call when a socket disconnects. Returns true if this was the user's
   * last connection (i.e. they are now fully offline).
   */
  unregisterConnection(userId: number): boolean {
    const count = (this.connectionCounts.get(userId) || 1) - 1;
    if (count <= 0) {
      this.connectionCounts.delete(userId);
      return true;
    }
    this.connectionCounts.set(userId, count);
    return false;
  }

  addToServer(userId: number, serverId: number): void {
    if (!this.serverUsers.has(serverId)) this.serverUsers.set(serverId, new Set());
    this.serverUsers.get(serverId)!.add(userId);
  }

  /** Remove a user from every server's presence set (used on full disconnect). Returns affected server ids. */
  removeFromAllServers(userId: number): number[] {
    const affected: number[] = [];
    for (const [serverId, users] of this.serverUsers.entries()) {
      if (users.delete(userId)) affected.push(serverId);
    }
    return affected;
  }

  getOnlineUserIds(serverId: number): number[] {
    return Array.from(this.serverUsers.get(serverId) || []);
  }
}
