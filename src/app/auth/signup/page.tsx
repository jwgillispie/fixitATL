'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserDoc } from '@/lib/services/users';
import { useAuthContext } from '@/contexts/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { fbUser, loading: authLoading } = useAuthContext();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && fbUser) router.replace('/account');
  }, [fbUser, authLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanName = displayName.trim();
    if (cleanName.length < 2) {
      setError('Please enter a display name (2 characters or more).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!agreed) {
      setError('Please agree to be cool before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: create the Firebase Auth user.
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Step 2: set the Auth profile displayName (for clients reading from Auth).
      await updateProfile(cred.user, { displayName: cleanName });

      // Step 3: create the Firestore user doc.
      // MUST happen after the Auth user exists, because the security rule
      // requires request.auth.uid to match the doc id.
      await createUserDoc(cred.user.uid, cred.user.email!, cleanName);

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
          <Link href="/auth/login" className="text-sm font-semibold hover:underline underline-offset-4">
            Already a member? Sign in →
          </Link>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-8 sm:p-16">
          <div className="w-full max-w-md">
            <div className="section-label mb-4">Create account</div>
            <h1 className="font-display-hero text-5xl sm:text-6xl mb-3 leading-[0.95]">
              Join<br />Fix-ATL.
            </h1>
            <p className="text-base ink-2 mb-10">Spot something broken, snap it, send it. We do the rest.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="field-label" htmlFor="name">Display name</label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="What should we call you?"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <p className="text-xs ink-3 mt-2">Visible on your reports and public profile</p>
              </div>
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
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 accent-black"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="ink-2">
                  I agree to be cool — reports are public, photos belong to me, I won&apos;t submit junk.
                </span>
              </label>

              {error && (
                <div className="banner" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-accent btn-block btn-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating account…' : 'Create account →'}
              </button>
            </form>

            <p className="mt-8 text-sm ink-3">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-black underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <aside
          className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden border-l"
          style={{ background: '#F2EFE7', borderColor: '#EAE6DA' }}
        >
          <svg className="absolute -bottom-32 -right-20 w-[600px] h-[600px] opacity-20" viewBox="0 0 100 100">
            <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="#E94E1B" />
          </svg>
          <div className="relative">
            <Image src="/logo.svg" alt="" width={48} height={48} />
          </div>
          <div className="relative max-w-md">
            <div className="section-label mb-4">Every fix starts with...</div>
            <h2 className="font-display-hero text-5xl mb-6 leading-[0.95]">
              ...someone<br />
              <span style={{ color: '#E94E1B' }}>seeing it.</span>
            </h2>
            <p className="text-base leading-relaxed ink-2">
              You don&apos;t have to be a contractor or a city official. Just a neighbor with a phone. We take it from there.
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
    case 'auth/email-already-in-use': return 'An account with that email already exists. Sign in instead?';
    case 'auth/invalid-email': return 'That email doesn\'t look right.';
    case 'auth/weak-password': return 'Password is too weak — try at least 8 characters.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    case 'permission-denied': return 'Account created but we couldn\'t save your profile. Refresh and try signing in.';
    default: return 'Something went wrong. Try again.';
  }
}
