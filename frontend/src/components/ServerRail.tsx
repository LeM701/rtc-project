'use client';

import Link from 'next/link';
import { ServerWithRole } from '@/lib/types';

interface ServerRailProps {
  servers: ServerWithRole[];
  activeServerId?: number;
}

export function ServerRail({ servers, activeServerId }: ServerRailProps) {
  return (
    <div className="flex w-[72px] flex-col items-center gap-2 border-r border-border bg-base py-3">
      {servers.map((server) => (
        <Link
          key={server.id}
          href={`/servers/${server.id}`}
          title={server.name}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold transition hover:rounded-xl ${
            server.id === activeServerId
              ? 'rounded-xl bg-accent text-white'
              : 'bg-panelAlt text-textDim hover:bg-accentSoft hover:text-white'
          }`}
        >
          {initials(server.name)}
        </Link>
      ))}

      <Link
        href="/servers"
        title="Rejoindre ou créer un serveur"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-panelAlt text-xl text-accent transition hover:rounded-xl hover:bg-accentSoft hover:text-white"
      >
        +
      </Link>
    </div>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}
