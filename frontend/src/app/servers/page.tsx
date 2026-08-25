'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { ServerRail } from '@/components/ServerRail';
import { useAuth } from '@/components/AuthProvider';
import { api, ApiError } from '@/lib/api';
import { ServerWithRole } from '@/lib/types';

function ServersDashboard() {
  const [servers, setServers] = useState<ServerWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newServerName, setNewServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api
      .listServers()
      .then(setServers)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const server = await api.createServer(newServerName);
      router.push(`/servers/${server.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors de la création');
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const server = await api.joinServer(inviteCode.trim());
      router.push(`/servers/${server.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur en rejoignant le serveur');
    }
  }

  return (
    <div className="flex h-screen bg-base">
      <ServerRail servers={servers} />

      <div className="flex flex-1 flex-col overflow-y-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">Tes serveurs</h1>
            <p className="text-sm text-textDim">Connecté en tant que {user?.username}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-textDim hover:text-text"
          >
            Se déconnecter
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <form onSubmit={handleCreate} className="rounded-xl border border-border bg-panel p-5">
            <h2 className="mb-3 font-medium text-text">Créer un serveur</h2>
            <div className="flex gap-2">
              <input
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Nom du serveur"
                required
                maxLength={64}
                className="flex-1 rounded-md border border-border bg-panelAlt px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
                Créer
              </button>
            </div>
          </form>

          <form onSubmit={handleJoin} className="rounded-xl border border-border bg-panel p-5">
            <h2 className="mb-3 font-medium text-text">Rejoindre avec un code</h2>
            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Code d'invitation"
                required
                className="flex-1 rounded-md border border-border bg-panelAlt px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <button type="submit" className="rounded-md bg-accentSoft px-4 py-2 text-sm font-medium text-white hover:bg-accentSoft/80">
                Rejoindre
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <p className="text-textDim">Chargement...</p>
        ) : servers.length === 0 ? (
          <p className="text-textDim">
            Tu n&apos;es dans aucun serveur pour l&apos;instant. Crée-en un ou rejoins-en un avec un code
            d&apos;invitation.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <button
                key={server.id}
                onClick={() => router.push(`/servers/${server.id}`)}
                className="rounded-xl border border-border bg-panel p-4 text-left transition hover:border-accent"
              >
                <p className="font-medium text-text">{server.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-textDim">{server.myRole}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServersPage() {
  return (
    <RequireAuth>
      <ServersDashboard />
    </RequireAuth>
  );
}
