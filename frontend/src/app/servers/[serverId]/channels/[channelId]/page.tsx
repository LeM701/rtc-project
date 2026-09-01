'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { ServerRail } from '@/components/ServerRail';
import { ChannelSidebar } from '@/components/ChannelSidebar';
import { MembersPanel } from '@/components/MembersPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Channel, Message, Server, ServerMember, ServerWithRole } from '@/lib/types';

interface TypingState {
  [userId: number]: string; // userId -> username, only present while typing
}

function Workspace() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [allServers, setAllServers] = useState<ServerWithRole[]>([]);
  const [server, setServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [typing, setTyping] = useState<TypingState>({});
  const [loading, setLoading] = useState(true);

  const serverIdNum = Number(serverId);
  const channelIdNum = Number(channelId);

  const myRole = allServers.find((s) => s.id === serverIdNum)?.myRole || 'member';
  const activeChannel = channels.find((c) => c.id === channelIdNum);

  const getUsername = useCallback(
    (userId: number) => members.find((m) => m.userId === userId)?.username || `#${userId}`,
    [members]
  );

  // --- initial data load, refetched whenever the server changes ---
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.listServers(),
      api.getServer(serverIdNum),
      api.listChannels(serverIdNum),
      api.listMembers(serverIdNum),
    ])
      .then(([servers, srv, chans, mems]) => {
        if (cancelled) return;
        setAllServers(servers);
        setServer(srv);
        setChannels(chans);
        setMembers(mems);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.replace('/servers');
      });

    return () => {
      cancelled = true;
    };
  }, [serverIdNum, router]);

  // --- message history, refetched whenever the channel changes ---
  useEffect(() => {
    if (!channelIdNum) return;
    let cancelled = false;

    api
      .listMessages(channelIdNum)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/servers/${serverIdNum}`);
      });

    setTyping({}); // clear stale typing state from the previous channel
    return () => {
      cancelled = true;
    };
  }, [channelIdNum, serverIdNum, router]);

  // --- socket: join the server room, and re-join on every reconnect ---
  useEffect(() => {
    if (!serverIdNum) return;
    const socket = getSocket();

    function joinServerRoom() {
      socket.emit('server:join', { serverId: serverIdNum });
    }

    joinServerRoom();
    socket.on('connect', joinServerRoom);

    return () => {
      socket.off('connect', joinServerRoom);
    };
  }, [serverIdNum]);

  // --- socket: join/leave the channel room as the active channel changes ---
  useEffect(() => {
    if (!channelIdNum) return;
    const socket = getSocket();

    function joinChannelRoom() {
      socket.emit('channel:join', { channelId: channelIdNum });
    }

    joinChannelRoom();
    socket.on('connect', joinChannelRoom);

    return () => {
      socket.off('connect', joinChannelRoom);
      socket.emit('channel:leave', { channelId: channelIdNum });
    };
  }, [channelIdNum]);

  // --- socket: event listeners ---
  useEffect(() => {
    const socket = getSocket();

    function handleNewMessage(message: Message) {
      if (message.channelId !== channelIdNum) return;
      setMessages((prev) => [...prev, message]);
      setTyping((prev) => {
        const next = { ...prev };
        delete next[message.authorId]; // a sent message implies they stopped typing
        return next;
      });
    }

    function handleMessageDeleted(payload: { channelId: number; messageId: number }) {
      if (payload.channelId !== channelIdNum) return;
      setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
    }

    function handleTypingUpdate(payload: { channelId: number; userId: number; username: string; isTyping:boolean }) {
      if (payload.channelId !== channelIdNum) return;
      setTyping((prev) => {
        const next = { ...prev };
        if (payload.isTyping) next[payload.userId] = payload.username;
        else delete next[payload.userId];
        return next;
      });
    }

    function handlePresenceUpdate(payload: { serverId: number; onlineUserIds: number[] }) {
      if (payload.serverId !== serverIdNum) return;
      setOnlineUserIds(payload.onlineUserIds);
    }

    socket.on('message:new', handleNewMessage);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [channelIdNum, serverIdNum]);

  const typingUsernames = useMemo(
    () => Object.entries(typing).filter(([userId]) => Number(userId) !== user?.id).map(([, name]) => name),
    [typing, user]
  );

  async function handleSend(content: string) {
    try {
      await api.sendMessage(channelIdNum, content); // the new message arrives back via 'message:new'
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'envoi du message");
    }
  }

  async function handleDelete(messageId: number) {
    try {
      await api.deleteMessage(messageId); // removal arrives back via 'message:deleted'
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }

  function handleTypingChange(isTyping: boolean) {
    getSocket().emit(isTyping ? 'typing:start' : 'typing:stop', { channelId: channelIdNum });
  }

  function handleRoleChanged() {
    // A role change can touch two rows at once (ownership transfer demotes
    // the old owner while promoting the new one), and can change *my own*
    // role too — so refetch both instead of trying to patch state locally.
    api.listMembers(serverIdNum).then(setMembers).catch(() => {});
    api.listServers().then(setAllServers).catch(() => {});
  }

  if (loading || !server || !activeChannel || !user) {
    return <div className="flex h-screen items-center justify-center bg-base text-textDim">Chargement...</div>;
  }

  return (
    <div className="flex h-screen bg-base">
      <ServerRail servers={allServers} activeServerId={serverIdNum} />
      <ChannelSidebar
        server={server}
        channels={channels}
        activeChannelId={channelIdNum}
        myRole={myRole}
        onChannelCreated={(channel) => setChannels((prev) => [...prev, channel])}
      />
      <ChatPanel
        key={channelIdNum}
        channelId={channelIdNum}
        channelName={activeChannel.name}
        messages={messages}
        typingUsernames={typingUsernames}
        currentUserId={user.id}
        myRole={myRole}
        getUsername={getUsername}
        onSend={handleSend}
        onDelete={handleDelete}
        onTypingChange={handleTypingChange}
      />
      <MembersPanel
        serverId={serverIdNum}
        members={members}
        onlineUserIds={onlineUserIds}
        myRole={myRole}
        currentUserId={user.id}
        onRoleChanged={handleRoleChanged}
      />
    </div>
  );
}

export default function ChannelPage() {
  return (
    <RequireAuth>
      <Workspace />
    </RequireAuth>
  );
}
