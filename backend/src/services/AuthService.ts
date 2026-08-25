import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { toPublicUser, PublicUser } from '../models/User';

const SALT_ROUNDS = 12;

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async signup(username: string, password: string): Promise<AuthResult> {
    this.validateCredentials(username, password);

    const existing = await this.userRepository.findByUsername(username);
    if (existing) {
      throw new AppError(409, 'Ce nom d\'utilisateur est déjà pris');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepository.create(username, passwordHash);

    return this.buildAuthResult(user.id, user.username, toPublicUser(user));
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new AppError(401, 'Identifiants invalides');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'Identifiants invalides');
    }

    return this.buildAuthResult(user.id, user.username, toPublicUser(user));
  }

  async getCurrentUser(userId: number): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'Utilisateur introuvable');
    }
    return toPublicUser(user);
  }

  private validateCredentials(username: string, password: string): void {
    if (!username || username.length < 3 || username.length > 32) {
      throw new AppError(400, 'Le nom d\'utilisateur doit contenir entre 3 et 32 caractères');
    }
    if (!password || password.length < 6) {
      throw new AppError(400, 'Le mot de passe doit contenir au moins 6 caractères');
    }
  }

  private buildAuthResult(userId: number, username: string, publicUser: PublicUser): AuthResult {
    const token = signToken({ userId, username });
    return { user: publicUser, token };
  }
}
