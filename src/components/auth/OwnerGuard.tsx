'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Wrap any page or section that requires the user to be a Fix-ATL owner.
 * Redirects to / while loading or when not an owner.
 */
export default function OwnerGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user?.isOwner) router.replace('/');
  }, [user, loading, router]);

  if (loading || !user?.isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[#6B6B66]">
        Checking access…
      </div>
    );
  }
  return <>{children}</>;
}
