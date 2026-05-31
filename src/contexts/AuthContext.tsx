'use client';

/**
 * AuthContext — the single source of auth state in the app.
 *
 * Provides:
 *   - fbUser: the Firebase Auth User (or null when signed out)
 *   - user:   the Firestore UserDoc (or null when signed out / not yet loaded)
 *   - loading: true until both onAuthStateChanged AND the user doc have resolved
 *
 * Use via `useAuthContext()` in any client component.
 * Wrap the root layout in <AuthProvider>.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { subscribeUserDoc } from '@/lib/services/users';
import { isAdminEmail } from '@/lib/constants';
import type { UserDoc } from '@/types/user';

interface AuthState {
  fbUser: User | null;
  user: UserDoc | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  fbUser: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [rawUser, setRawUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Global error capture — surface anything that crashes a render so we can
  // diagnose the "This page couldn't load" issue.
  useEffect(() => {
    function onErr(e: ErrorEvent) {
      // eslint-disable-next-line no-console
      console.error('[FIXATL][window.onerror]', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error,
      });
    }
    function onRej(e: PromiseRejectionEvent) {
      // eslint-disable-next-line no-console
      console.error('[FIXATL][unhandledrejection]', e.reason);
    }
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    // eslint-disable-next-line no-console
    console.log('[FIXATL][app] boot', {
      pathname: window.location.pathname,
      ua: navigator.userAgent.slice(0, 80),
    });
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  // Track auth state.
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      if (!u) {
        setRawUser(null);
        setLoading(false);
      }
      // If u exists, the second effect picks up and starts the user-doc subscription.
    });
    return unsubAuth;
  }, []);

  // Subscribe to the user doc whenever fbUser changes.
  useEffect(() => {
    if (!fbUser) return;
    const unsubDoc = subscribeUserDoc(fbUser.uid, (u) => {
      setRawUser(u);
      setLoading(false);
    });
    return unsubDoc;
  }, [fbUser]);

  // Derive isOwner from email (single source of truth = ADMIN_EMAILS).
  // The user doc's isOwner field is ignored — rules also check email.
  const user = useMemo<UserDoc | null>(() => {
    if (!rawUser) return null;
    return { ...rawUser, isOwner: isAdminEmail(fbUser?.email ?? rawUser.email) };
  }, [rawUser, fbUser]);

  return (
    <AuthContext.Provider value={{ fbUser, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
