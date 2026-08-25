'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/components/AuthProvider';

export default function SignupPage() {
  const { signup } = useAuth();

  return (
    <AuthForm
      title="Créer un compte"
      submitLabel="S'inscrire"
      onSubmit={signup}
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Se connecter
          </Link>
        </>
      }
    />
  );
}
