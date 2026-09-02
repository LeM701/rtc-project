'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { Message, ServerRole } from '@/lib/types';
import { api } from '@/lib/api';

interface ChatPanelProps {
  channelId: number;
  channelName: string;
  messages: Message[];
  typingUsernames: string[];
  currentUserId: number;
  myRole: ServerRole;
  getUsername: (userId: number) => string;
  onSend: (content: string) => void;
  onDelete: (messageId: number) => void;
  onTypingChange: (isTyping: boolean) => void;
}

export function ChatPanel({
  channelName,
  messages,
  typingUsernames,
  currentUserId,
  myRole,
  getUsername,
  onSend,
  onDelete,
  onTypingChange,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isTypingRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleChange(value: string) {
    setDraft(value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingChange(false);
    }, 2000);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    onSend(content);
    setDraft('');
    clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    onTypingChange(false);
  }

  const canDeleteAny = myRole === 'admin' || myRole === 'owner';

  return (
    <div className="flex flex-1 flex-col bg-base">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium text-text">
          <span className="text-textDim">#</span> {channelName}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="mt-4 text-sm text-textDim">Aucun message pour l&apos;instant. Sois le premier à écrire !</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => {
              const canDelete = message.authorId === currentUserId || canDeleteAny;
              return (
                <li key={message.id} className="group flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-text">{getUsername(message.authorId)}</span>
                      <span className="text-[11px] text-textDim">{formatTime(message.createdAt)}</span>
                    </div>
                    <p className="text-sm text-text/90">{message.content}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => onDelete(message.id)}
                      className="text-xs text-textDim opacity-0 transition group-hover:opacity-100 hover:text-danger"
                    >
                      Supprimer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="h-5 px-4 text-xs text-textDim">
        {typingUsernames.length > 0 && (
          <span>
            {typingUsernames.join(', ')} {typingUsernames.length > 1 ? 'sont' : 'est'} en train d&apos;écrire...
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 pt-2">
        <input
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Écrire dans #${channelName}`}
          maxLength={2000}
          className="w-full rounded-md border border-border bg-panelAlt px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </form>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
