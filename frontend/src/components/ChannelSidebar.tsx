'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, Server, ServerRole } from '@/lib/types';
import { api, ApiError } from '@/lib/api';

interface ChannelSidebarProps {
  server: Server;
  channels: Channel[];
  activeChannelId: number;
  myRole: ServerRole;
  onChannelCreated: (channel: Channel) => void;
  onChannelDeleted: (channelId: number) => void;
}

export function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  myRole,
  onChannelCreated,
  onChannelDeleted,
}: ChannelSidebarProps) {
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const canManage = myRole === 'owner' || myRole === 'admin';

  async function handleCreateChannel(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const channel = await api.createChannel(server.id, newChannelName);
      setNewChannelName('');
      setShowNewChannel(false);
      onChannelCreated(channel);
      router.push(`/servers/${server.id}/channels/${channel.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création du channel');
    }
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(server.inviteCode);
  }

  async function handleDeleteChannel(e: React.MouseEvent, channel: Channel) {
    e.stopPropagation();
    if (!confirm(`Supprimer le channel #${channel.name} ? Tous ses messages seront perdus.`)) return;

    try {
      await api.deleteChannel(channel.id);
      onChannelDeleted(channel.id);
      if (channel.id === activeChannelId) {
        router.push(`/servers/${server.id}`);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erreur lors de la suppression du channel');
    }
  }

  async function handleLeaveOrDelete() {
    try {
      if (myRole === 'owner') {
        if (!confirm(`Supprimer définitivement "${server.name}" ? Cette action est irréversible.`)) return;
        await api.deleteServer(server.id);
      } else {
        if (!confirm(`Quitter "${server.name}" ?`)) return;
        await api.leaveServer(server.id);
      }
      router.push('/servers');
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    }
  }

  return (
    <div className="flex w-60 flex-col border-r border-border bg-panel">
      <div className="border-b border-border p-4">
        <h1 className="truncate font-semibold text-text">{server.name}</h1>
        <button onClick={copyInviteCode} className="mt-1 text-xs text-textDim hover:text-accent">
          Copier le code d&apos;invitation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-1 flex items-center justify-between px-2 text-xs font-medium uppercase tracking-wide text-textDim">
          <span>Channels</span>
          {canManage && (
            <button
              onClick={() => setShowNewChannel((v) => !v)}
              title="Créer un channel"
              className="flex h-5 w-5 items-center justify-center rounded bg-panelAlt text-sm leading-none text-text hover:bg-accent hover:text-white"
            >
              +
            </button>
          )}
        </div>

        {showNewChannel && (
          <form onSubmit={handleCreateChannel} className="mb-2 px-2">
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="nom-du-channel"
              autoFocus
              required
              maxLength={64}
              className="w-full rounded-md border border-border bg-panelAlt px-2 py-1 text-sm text-text outline-none focus:border-accent"
            />
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          </form>
        )}

        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => router.push(`/servers/${server.id}/channels/${channel.id}`)}
            className={`group mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition ${
              channel.id === activeChannelId ? 'bg-panelAlt text-text' : 'text-textDim hover:bg-panelAlt/60 hover:text-text'
            }`}
          >
            <span className="text-textDim">#</span>
            <span className="flex-1 truncate">{channel.name}</span>
            {canManage && (
              <span
                role="button"
                onClick={(e) => handleDeleteChannel(e, channel)}
                title="Supprimer le channel"
                className="rounded px-1 text-xs text-textDim opacity-0 hover:text-danger group-hover:opacity-100"
              >
                ✕
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <button onClick={handleLeaveOrDelete} className="w-full text-left text-xs text-danger hover:underline">
          {myRole === 'owner' ? 'Supprimer le serveur' : 'Quitter le serveur'}
        </button>
      </div>
    </div>
  );
}
