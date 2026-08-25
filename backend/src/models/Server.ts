export type ServerRole = 'owner' | 'admin' | 'member';

export interface Server {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: Date;
}

export interface ServerMember {
  serverId: number;
  userId: number;
  role: ServerRole;
  joinedAt: Date;
}

// What API clients see: server info + the caller's own role in it
export interface ServerWithRole extends Server {
  myRole: ServerRole;
}
