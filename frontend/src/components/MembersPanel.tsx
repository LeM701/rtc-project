'use client';

import { useState } from 'react';
import { ServerMember, ServerRole } from '@/lib/types';
import { api } from '@/lib/api';

interface MembersPanelProps {
  serverId: number;
  members: ServerMember[];
  onlineUserIds: number[];
  myRole: ServerRole;
  currentUserId: number;
  onRoleChanged: (member: ServerMember) => void;
}

const ROLE_LABELS: Record<ServerRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export function MembersPanel({ serverId, members, onlineUserIds, myRole, currentUserId, onRoleChanged }: MembersPanelProps) {
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  async function handleRoleChange(userId: number, role: ServerRole) {
    setPendingUserId(userId);
    try {
      const updated = await api.updateMemberRole(serverId, userId, role);
      onRoleChanged(updated);
    } finally {
      setPendingUserId(null);
    }
  }

  const sorted = [...members].sort((a, b) => a.role.localeCompare(b.role));

  return (
    <div className="w-56 border-l border-border bg-panel p-3">
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-textDim">
        Membres — {members.length}
      </h2>

      <ul className="flex flex-col gap-1">
        {sorted.map((member) => {
          const online = onlineUserIds.includes(member.userId);
          const isSelf = member.userId === currentUserId;

          return (
            <li key={member.userId} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-panelAlt/60">
              <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-online' : 'bg-border'}`} />
              <span className="flex-1 truncate text-sm text-text">
                {member.username}
                {isSelf && <span className="text-textDim"> (toi)</span>}
              </span>

              {myRole === 'owner' && !isSelf ? (
                <select
                  value={member.role}
                  disabled={pendingUserId === member.userId}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as ServerRole)}
                  className="rounded border border-border bg-panelAlt px-1 py-0.5 text-xs text-textDim outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner (transfert)</option>
                </select>
              ) : (
                <span className="text-xs text-textDim">{ROLE_LABELS[member.role]}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
