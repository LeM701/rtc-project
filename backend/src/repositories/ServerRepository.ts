import { Queryable } from '../utils/transaction';
import { Server } from '../models/Server';

function mapRow(row: any): Server {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

export class ServerRepository {
  constructor(private db: Queryable) {}

  async findById(id: number, runner: Queryable = this.db): Promise<Server | null> {
    const result = await runner.query('SELECT * FROM servers WHERE id = $1', [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByInviteCode(inviteCode: string): Promise<Server | null> {
    const result = await this.db.query('SELECT * FROM servers WHERE invite_code = $1', [inviteCode]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(name: string, inviteCode: string, runner: Queryable = this.db): Promise<Server> {
    const result = await runner.query(
      `INSERT INTO servers (name, invite_code) VALUES ($1, $2) RETURNING *`,
      [name, inviteCode]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: number, name: string): Promise<Server | null> {
    const result = await this.db.query(
      `UPDATE servers SET name = $1 WHERE id = $2 RETURNING *`,
      [name, id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM servers WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
