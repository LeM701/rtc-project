'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';

interface AuthFormProps {
  title: string;
  submitLabel: string;
  onSubmit: (username: string, password: string) => Promise<void>;
  footer: React.ReactNode;
}

export function AuthForm({ title, submitLabel, onSubmit, footer }: AuthFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(username, password);
      router.replace('/servers');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-8">
        <h1 className="mb-6 text-xl font-semibold text-text">{title}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-textDim">
              Nom d&apos;utilisateur
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              autoFocus
              className="w-full rounded-md border border-border bg-panelAlt px-3 py-2 text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-textDim">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-border bg-panelAlt px-3 py-2 text-text outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? '...' : submitLabel}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-textDim">{footer}</div>
      </div>
    </div>
  );
}
