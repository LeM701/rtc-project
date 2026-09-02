'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <AuthForm
      title="Connexion"
      submitLabel="Se connecter"
      onSubmit={login}
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-accent hover:underline">
            Créer un compte
          </Link>
        </>
      }
    />
  );
}
