'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/servers' : '/login');
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-base text-textDim">
      Chargement...
    </div>
  );
}
