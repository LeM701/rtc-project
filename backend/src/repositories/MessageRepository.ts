import { Queryable } from '../utils/transaction';
import { Message } from '../models/Message';

function mapRow(row: any): Message {
  return {
    id: row.id,
    channelId: row.channel_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

export class MessageRepository {
  constructor(private db: Queryable) {}

  async findById(id: number): Promise<Message | null> {
    const result = await this.db.query('SELECT * FROM messages WHERE id = $1', [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listByChannel(channelId: number): Promise<Message[]> {
    const result = await this.db.query(
      'SELECT * FROM messages WHERE channel_id = $1 ORDER BY created_at ASC',
      [channelId]
    );
    return result.rows.map(mapRow);
  }

  async create(channelId: number, authorId: number, content: string): Promise<Message> {
    const result = await this.db.query(
      `INSERT INTO messages (channel_id, author_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [channelId, authorId, content]
    );
    return mapRow(result.rows[0]);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM messages WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
