/**
 * Fix-ATL Firebase initialization.
 *
 * IMPORTANT: this is a client-side singleton. All Firebase services
 * (Firestore, Auth, Storage) are exported from here. Never call
 * initializeApp() anywhere else in the app.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAnalytics, getAnalytics, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// HMR-safe init: reuse the existing app on hot reloads.
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Initialize Analytics on the client only.
 *
 * `send_page_view` is disabled because we'll fire page_view manually on every
 * client-side route change. Next.js App Router is effectively a SPA — the
 * SDK's automatic page_view only catches hard document loads, leaving internal
 * navigation untracked and double-counting the first page.
 */
function initAnalytics(): Analytics | null {
  if (typeof window === 'undefined') return null;
  try {
    return initializeAnalytics(app, { config: { send_page_view: false } });
  } catch {
    // Already initialized (e.g. dev hot-reload re-evaluated this module).
    return getAnalytics(app);
  }
}

export const analytics = initAnalytics();
export default app;
