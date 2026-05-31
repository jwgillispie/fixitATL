'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { fbUser, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to /account.
  useEffect(() => {
    if (!authLoading && fbUser) router.replace('/account');
  }, [fbUser, authLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/account');
    } catch (err) {
      setError(humanizeAuthError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[#EAE6DA] bg-[#FAFAF7]">
        <div className="container h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={32} height={32} />
            <span className="wordmark text-[17px]">Fix–ATL</span>
          </Link>
          <Link href="/auth/signup" className="text-sm font-semibold hover:underline underline-offset-4">
            Create an account →
          </Link>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-8 sm:p-16">
          <div className="w-full max-w-md">
            <div className="section-label mb-4">Sign in</div>
            <h1 className="font-display-hero text-5xl sm:text-6xl mb-3 leading-[0.95]">
              Welcome<br />back.
            </h1>
            <p className="text-base ink-2 mb-10">Submit reports, track your impact, see what we&apos;ve fixed.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="field-label !mb-0" htmlFor="password">Password</label>
                </div>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="banner" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-block btn-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>

            <p className="mt-8 text-sm ink-3">
              New to Fix-ATL?{' '}
              <Link href="/auth/signup" className="font-semibold text-black underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <aside
          className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden border-l"
          style={{ background: '#F2EFE7', borderColor: '#EAE6DA' }}
        >
          <svg className="absolute -top-20 -right-20 w-[500px] h-[500px] opacity-20" viewBox="0 0 100 100">
            <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="#E94E1B" />
          </svg>
          <div className="relative">
            <Image src="/logo.svg" alt="" width={48} height={48} />
          </div>
          <div className="relative max-w-md">
            <div className="section-label mb-4">The numbers</div>
            <h2 className="font-display-hero text-5xl mb-6 leading-[0.95]">
              68 fixes.<br />
              1,750 reporters.<br />
              <span style={{ color: '#E94E1B' }}>One city.</span>
            </h2>
            <p className="text-base leading-relaxed ink-2">
              Snap a pic of something broken in your neighborhood and we&apos;ll go fix it. Join 1,750 Atlantans keeping the city in repair.
            </p>
          </div>
          <div className="relative"></div>
        </aside>
      </main>
    </div>
  );
}

function humanizeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email': return 'That email doesn\'t look right.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests': return 'Too many tries. Wait a minute and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Something went wrong. Try again.';
  }
}
