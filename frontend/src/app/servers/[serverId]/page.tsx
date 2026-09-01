'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { ServerRail } from '@/components/ServerRail';
import { api, ApiError } from '@/lib/api';
import { ServerWithRole } from '@/lib/types';
function ServerLanding() {
  const { serverId } = useParams<{ serverId: string }>();
  const router = useRouter();
  const [servers, setServers] = useState<ServerWithRole[]>([]);
  const [checking, setChecking] = useState(true);
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [allServers, channels] = await Promise.all([
          api.listServers(),
          api.listChannels(Number(serverId)),
        ]);
        if (cancelled) return;
        setServers(allServers);
        if (channels.length > 0) {
          router.replace(`/servers/${serverId}/channels/${channels[0].id}`);
        } else {
          setChecking(false);
        }
      } catch {
        if (!cancelled) router.replace('/servers');
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [serverId, router]);
  async function handleCreateChannel(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const channel = await api.createChannel(Number(serverId), channelName);
      router.push(`/servers/${serverId}/channels/${channel.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création du channel');
    }
  }
  if (checking) {
    return <div className="flex h-screen items-center justify-center bg-base text-textDim">Chargement...</div>;
  }
  const myRole = servers.find((s) => s.id === Number(serverId))?.myRole;
  const canCreateChannel = myRole === 'owner' || myRole === 'admin';
  return (
    <div className="flex h-screen bg-base">
      <ServerRail servers={servers} activeServerId={Number(serverId)} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-textDim">
        {canCreateChannel ? (
          <>
            <p>Ce serveur n&apos;a pas encore de channel. Crée le premier :</p>
            <form onSubmit={handleCreateChannel} className="flex gap-2">
              <input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="nom-du-channel"
                autoFocus
                required
                maxLength={64}
                className="rounded-md border border-border bg-panelAlt px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
                Créer
              </button>
            </form>
            {error && <p className="text-sm text-danger">{error}</p>}
          </>
        ) : (
          <p>Ce serveur n&apos;a pas encore de channel. Un Admin ou l&apos;Owner doit en créer un.</p>
        )}
      </div>
    </div>
  );
}
export default function ServerPage() {
  return (
    <RequireAuth>
      <ServerLanding />
    </RequireAuth>
  );
}
