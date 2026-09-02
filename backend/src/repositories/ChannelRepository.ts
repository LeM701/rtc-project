import { Queryable } from '../utils/transaction';
import { Channel } from '../models/Channel';

function mapRow(row: any): Channel {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export class ChannelRepository {
  constructor(private db: Queryable) {}

  async findById(id: number): Promise<Channel | null> {
    const result = await this.db.query('SELECT * FROM channels WHERE id = $1', [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listByServer(serverId: number): Promise<Channel[]> {
    const result = await this.db.query(
      'SELECT * FROM channels WHERE server_id = $1 ORDER BY created_at ASC',
      [serverId]
    );
    return result.rows.map(mapRow);
  }

  async create(serverId: number, name: string): Promise<Channel> {
    const result = await this.db.query(
      `INSERT INTO channels (server_id, name) VALUES ($1, $2) RETURNING *`,
      [serverId, name]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: number, name: string): Promise<Channel | null> {
    const result = await this.db.query(
      `UPDATE channels SET name = $1 WHERE id = $2 RETURNING *`,
      [name, id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM channels WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
