import crypto from 'crypto';

export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('hex'); // 12 chars, e.g. "a1b2c3d4e5f6"
}
