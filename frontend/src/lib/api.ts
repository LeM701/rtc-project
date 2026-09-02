import {
  PublicUser,
  Server,
  ServerWithRole,
  ServerMember,
  ServerRole,
  Channel,
  Message,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include', // send the httpOnly session cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new ApiError(res.status, body.message || 'Erreur inconnue');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // --- auth ---
  signup: (username: string, password: string) =>
    request<PublicUser>('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<PublicUser>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<PublicUser>('/me'),

  // --- servers ---
  listServers: () => request<ServerWithRole[]>('/servers'),
  createServer: (name: string) => request<Server>('/servers', { method: 'POST', body: JSON.stringify({ name }) }),
  getServer: (serverId: number) => request<Server>(`/servers/${serverId}`),
  updateServer: (serverId: number, name: string) =>
    request<Server>(`/servers/${serverId}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteServer: (serverId: number) => request<void>(`/servers/${serverId}`, { method: 'DELETE' }),
  joinServer: (inviteCode: string) => request<Server>(`/servers/${inviteCode}/join`, { method: 'POST' }),
  leaveServer: (serverId: number) => request<void>(`/servers/${serverId}/leave`, { method: 'DELETE' }),
  listMembers: (serverId: number) => request<ServerMember[]>(`/servers/${serverId}/members`),
  updateMemberRole: (serverId: number, userId: number, role: ServerRole) =>
    request<ServerMember>(`/servers/${serverId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  // --- channels ---
  listChannels: (serverId: number) => request<Channel[]>(`/servers/${serverId}/channels`),
  createChannel: (serverId: number, name: string) =>
    request<Channel>(`/servers/${serverId}/channels`, { method: 'POST', body: JSON.stringify({ name }) }),
  updateChannel: (channelId: number, name: string) =>
    request<Channel>(`/channels/${channelId}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteChannel: (channelId: number) => request<void>(`/channels/${channelId}`, { method: 'DELETE' }),

  // --- messages ---
  listMessages: (channelId: number) => request<Message[]>(`/channels/${channelId}/messages`),
  sendMessage: (channelId: number, content: string) =>
    request<Message>(`/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteMessage: (messageId: number) => request<void>(`/messages/${messageId}`, { method: 'DELETE' }),
};
