export interface User {
  id: number;
  username: string;
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: Date;
}

// What we send back to clients — never the password hash
export interface PublicUser {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}
