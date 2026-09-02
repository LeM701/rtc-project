import { Queryable } from '../utils/transaction';
import { ServerMember, ServerRole, ServerWithRole } from '../models/Server';

function mapMemberRow(row: any): ServerMember {
  return {
    serverId: row.server_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

export class ServerMemberRepository {
  constructor(private db: Queryable) {}

  async addMember(
    serverId: number,
    userId: number,
    role: ServerRole,
    runner: Queryable = this.db
  ): Promise<ServerMember> {
    const result = await runner.query(
      `INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3) RETURNING *`,
      [serverId, userId, role]
    );
    return mapMemberRow(result.rows[0]);
  }

  async findMembership(serverId: number, userId: number): Promise<ServerMember | null> {
    const result = await this.db.query(
      'SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return result.rows[0] ? mapMemberRow(result.rows[0]) : null;
  }

  async removeMember(serverId: number, userId: number): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2 RETURNING server_id',
      [serverId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateRole(
    serverId: number,
    userId: number,
    role: ServerRole,
    runner: Queryable = this.db
  ): Promise<ServerMember | null> {
    const result = await runner.query(
      `UPDATE server_members SET role = $1 WHERE server_id = $2 AND user_id = $3 RETURNING *`,
      [role, serverId, userId]
    );
    return result.rows[0] ? mapMemberRow(result.rows[0]) : null;
  }

  async listMembers(serverId: number): Promise<(ServerMember & { username: string })[]> {
    const result = await this.db.query(
      `SELECT sm.*, u.username
       FROM server_members sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.server_id = $1
       ORDER BY sm.joined_at ASC`,
      [serverId]
    );
    return result.rows.map((row: any) => ({ ...mapMemberRow(row), username: row.username }));
  }

  // All servers a user belongs to, with their role in each — one query,
  // avoids N+1 (fetch servers, then loop to fetch role for each).
  async listServersForUser(userId: number): Promise<ServerWithRole[]> {
    const result = await this.db.query(
      `SELECT s.*, sm.role AS my_role
       FROM servers s
       JOIN server_members sm ON sm.server_id = s.id
       WHERE sm.user_id = $1
       ORDER BY s.created_at ASC`,
      [userId]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      inviteCode: row.invite_code,
      createdAt: row.created_at,
      myRole: row.my_role,
    }));
  }
}
