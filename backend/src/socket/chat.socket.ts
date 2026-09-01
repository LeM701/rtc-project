import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Pool } from 'pg';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';
import { parseCookie } from '../utils/parseCookie';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ServerMemberRepository } from '../repositories/ServerMemberRepository';
import { PermissionService } from '../services/PermissionService';
import { PresenceService } from '../services/PresenceService';
import { RealtimeGateway } from './RealtimeGateway';
import { Message } from '../models/Message';
import { Channel } from '../models/Channel';

export class ChatSocketServer implements RealtimeGateway {
  private io: SocketIOServer;
  private presence = new PresenceService();
  private permissions: PermissionService;
  private channelRepository: ChannelRepository;

  constructor(httpServer: http.Server, db: Pool) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: env.clientUrl, credentials: true },
    });
    this.permissions = new PermissionService(new ServerMemberRepository(db));
    this.channelRepository = new ChannelRepository(db);

    this.io.use(this.authenticate);
    this.io.on('connection', this.handleConnection);
  }

  // --- auth ---

  private authenticate = (socket: Socket, next: (err?: Error) => void) => {
    const token = parseCookie(socket.handshake.headers.cookie, 'token');
    if (!token) {
      next(new Error('Non authentifié'));
      return;
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Session invalide ou expirée'));
    }
  };

  // --- connection lifecycle ---

  private handleConnection = (socket: Socket) => {
    const userId: number = socket.data.user.userId;
    this.presence.registerConnection(userId);

    socket.on('server:join', (payload: { serverId: number }, ack?: () => void) =>
      this.handleServerJoin(socket, payload, ack)
    );
    socket.on('channel:join', (payload: { channelId: number }, ack?: () => void) =>
      this.handleChannelJoin(socket, payload, ack)
    );
    socket.on('channel:leave', (payload: { channelId: number }) => {
      socket.leave(`channel:${payload.channelId}`);
    });
    socket.on('typing:start', (payload: { channelId: number }) => this.handleTyping(socket, payload, true));
    socket.on('typing:stop', (payload: { channelId: number }) => this.handleTyping(socket, payload, false));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  };

  private handleServerJoin = async (socket: Socket, { serverId }: { serverId: number }, ack?: () => void) => {
    const userId: number = socket.data.user.userId;
    try {
      await this.permissions.requireMembership(serverId, userId);
    } catch {
      socket.emit('error', { message: "Vous n'êtes pas membre de ce serveur" });
      return;
    }

    socket.join(`server:${serverId}`);
    this.presence.addToServer(userId, serverId);
    this.broadcastPresence(serverId);
    ack?.();
  };

  private handleChannelJoin = async (socket: Socket, { channelId }: { channelId: number }, ack?: () => void) => {
    try {
      await this.verifyChannelMembership(channelId, socket.data.user.userId);
    } catch {
      socket.emit('error', { message: "Vous n'êtes pas autorisé à rejoindre ce channel" });
      return;
    }
    socket.join(`channel:${channelId}`);
    ack?.();
  };

  private handleTyping = async (socket: Socket, { channelId }: { channelId: number }, isTyping: boolean) => {
    try {
      await this.verifyChannelMembership(channelId, socket.data.user.userId);
    } catch {
      return; // silently ignore — not worth an error event for a transient typing signal
    }

    // socket.to() excludes the sender: you don't need to see your own "typing" event
    socket.to(`channel:${channelId}`).emit('typing:update', {
      channelId,
      userId: socket.data.user.userId,
      username: socket.data.user.username,
      isTyping,
    });
  };

  private handleDisconnect = (socket: Socket) => {
    const userId: number = socket.data.user.userId;
    const wentFullyOffline = this.presence.unregisterConnection(userId);
    if (!wentFullyOffline) return;

    const affectedServers = this.presence.removeFromAllServers(userId);
    for (const serverId of affectedServers) {
      this.broadcastPresence(serverId);
    }
  };

  private broadcastPresence(serverId: number): void {
    this.io.to(`server:${serverId}`).emit('presence:update', {
      serverId,
      onlineUserIds: this.presence.getOnlineUserIds(serverId),
    });
  }

  private async verifyChannelMembership(channelId: number, userId: number): Promise<Channel> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) throw new Error('Channel introuvable');
    await this.permissions.requireMembership(channel.serverId, userId);
    return channel;
  }

  // --- RealtimeGateway implementation, called by MessageService after a REST write ---

  broadcastNewMessage(channelId: number, message: Message): void {
    this.io.to(`channel:${channelId}`).emit('message:new', message);
  }

  broadcastMessageDeleted(channelId: number, messageId: number): void {
    this.io.to(`channel:${channelId}`).emit('message:deleted', { channelId, messageId });
  }
}
