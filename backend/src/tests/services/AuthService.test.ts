import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { User } from '../../models/User';

class FakeUserRepository {
  private users: User[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.find((u) => u.username === username) || null;
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const user: User = {
      id: this.nextId++,
      username,
      passwordHash,
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }
}

function buildService() {
  const repo = new FakeUserRepository() as unknown as UserRepository;
  return new AuthService(repo);
}

describe('AuthService', () => {
  it('creates a user and returns a token on signup', async () => {
    const service = buildService();
    const result = await service.signup('alice', 'password123');

    expect(result.user.username).toBe('alice');
    expect(result.token).toBeDefined();
  });

  it('rejects signup with a username that is already taken', async () => {
    const service = buildService();
    await service.signup('alice', 'password123');

    await expect(service.signup('alice', 'other-password')).rejects.toThrow(
      "Ce nom d'utilisateur est déjà pris"
    );
  });

  it('rejects signup with a password that is too short', async () => {
    const service = buildService();
    await expect(service.signup('bob', '123')).rejects.toThrow();
  });

  it('logs in with correct credentials', async () => {
    const service = buildService();
    await service.signup('alice', 'password123');

    const result = await service.login('alice', 'password123');
    expect(result.user.username).toBe('alice');
  });

  it('rejects login with a wrong password', async () => {
    const service = buildService();
    await service.signup('alice', 'password123');

    await expect(service.login('alice', 'wrong-password')).rejects.toThrow(
      'Identifiants invalides'
    );
  });

  it('rejects login for a username that does not exist', async () => {
    const service = buildService();
    await expect(service.login('ghost', 'password123')).rejects.toThrow(
      'Identifiants invalides'
    );
  });

  it('trims whitespace from the username on signup, so it cannot bypass uniqueness', async () => {
    const service = buildService();
    await service.signup('alice', 'password123');

    await expect(service.signup('  alice  ', 'other-password')).rejects.toThrow(
      "Ce nom d'utilisateur est déjà pris"
    );
  });

  it('stores the trimmed username, not the raw input with whitespace', async () => {
    const service = buildService();
    const result = await service.signup('  bob  ', 'password123');

    expect(result.user.username).toBe('bob');
  });

  it('logs in even if the username has stray whitespace', async () => {
    const service = buildService();
    await service.signup('alice', 'password123');

    const result = await service.login('  alice  ', 'password123');
    expect(result.user.username).toBe('alice');
  });
});
