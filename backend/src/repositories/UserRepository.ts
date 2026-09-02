import { Pool } from 'pg';
import { User } from '../models/User';

function mapRow(row: any): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export class UserRepository {
  constructor(private db: Pool) {}

  async findById(id: number): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const result = await this.db.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *`,
      [username, passwordHash]
    );
    return mapRow(result.rows[0]);
  }
}
