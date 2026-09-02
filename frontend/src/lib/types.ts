export type ServerRole = 'owner' | 'admin' | 'member';

export interface PublicUser {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface Server {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface ServerWithRole extends Server {
  myRole: ServerRole;
}

export interface ServerMember {
  serverId: number;
  userId: number;
  username: string;
  role: ServerRole;
  joinedAt: string;
}

export interface Channel {
  id: number;
  serverId: number;
  name: string;
  createdAt: string;
}

export interface Message {
  id: number;
  channelId: number;
  authorId: number;
  content: string;
  createdAt: string;
}
