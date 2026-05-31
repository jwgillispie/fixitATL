'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Wrap any page or section that requires the user to be signed in.
 * Redirects to /auth/login while loading or when not signed in.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const { fbUser, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !fbUser) router.replace('/auth/login');
  }, [fbUser, loading, router]);

  if (loading || !fbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[#6B6B66]">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
