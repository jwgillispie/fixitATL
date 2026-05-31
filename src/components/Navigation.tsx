'use client';

/**
 * Sticky site navigation. Variants:
 *   - signed-out: Sign in + Get started
 *   - member:     avatar (→ /account)
 *   - owner:      Owner badge + Queue link + avatar
 *
 * Uses useAuthContext to decide which variant to render.
 * Use the `active` prop to mark the current page.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useAuthContext } from '@/contexts/AuthContext';

type Active = 'feed' | 'map' | 'submit' | 'queue' | 'post' | 'account' | null;

interface NavigationProps {
  active?: Active;
  /** Use the dark-surface header variant (matches owner pages). */
  dark?: boolean;
}

export default function Navigation({ active = null, dark = false }: NavigationProps) {
  const { fbUser, user, loading } = useAuthContext();
  const isOwner = !!user?.isOwner;

  const headerClass = dark
    ? 'sticky top-0 z-40 bg-[#0A0A0A]/85 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)]'
    : 'sticky top-0 z-40 bg-[#FAFAF7]/85 backdrop-blur-md border-b border-[#EAE6DA]';

  const wordClass = dark ? 'text-[#FAFAF7]' : '';

  return (
    <header className={headerClass}>
      <div className="container h-[72px] flex items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="" width={32} height={32} />
          <span className={`wordmark text-[17px] ${wordClass}`}>Fix–ATL</span>
          {isOwner && (
            <span className="ml-3 px-2 py-0.5 rounded-full bg-[rgba(233,78,27,0.15)] text-[#E94E1B] text-[10px] font-bold uppercase tracking-wider border border-[rgba(233,78,27,0.3)]">
              Owner
            </span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-8 relative">
          <Link href="/feed" className={`nav-link ${active === 'feed' ? 'active' : ''}`}>Feed</Link>
          <Link href="/map" className={`nav-link ${active === 'map' ? 'active' : ''}`}>Map</Link>
          <Link href="/submit" className={`nav-link ${active === 'submit' ? 'active' : ''}`}>Report</Link>
          {isOwner && (
            <>
              <Link href="/account/queue" className={`nav-link ${active === 'queue' ? 'active' : ''}`}>Queue</Link>
              <Link href="/account/post" className={`nav-link ${active === 'post' ? 'active' : ''}`}>Post fix</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm ink-3">…</span>
          ) : fbUser ? (
            <Link
              href="/account"
              className={`avatar w-9 h-9 ${isOwner ? 'bg-[#0A0A0A] flex items-center justify-center' : ''}`}
              style={
                isOwner
                  ? { borderColor: dark ? 'var(--dark-hair-strong)' : 'var(--surface)' }
                  : { background: 'linear-gradient(135deg, #FDBA74, #F472B6)' }
              }
              aria-label="Your account"
            >
              {isOwner && <Image src="/logo.svg" alt="" width={20} height={20} />}
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`hidden sm:inline text-sm font-medium ${dark ? 'text-[var(--dark-ink-2)] hover:text-white' : 'ink-2 hover:text-black'}`}
              >
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
