/**
 * Users service — all reads and writes for `users/{uid}` go through this file.
 *
 * Never write user docs directly from page/component code.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserDoc } from '@/types/user';

/**
 * Create a `users/{uid}` doc immediately after Firebase Auth signup.
 *
 * MUST be called with the same uid that Firebase Auth just returned, otherwise
 * the security rules reject the write.
 *
 * isOwner is hardcoded to `false` here. The rule enforces this on creation —
 * the field can only be flipped manually in the Firebase Console.
 */
export async function createUserDoc(
  uid: string,
  email: string,
  displayName: string,
): Promise<void> {
  const now = serverTimestamp();
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName,
    photoUrl: null,
    isOwner: false,
    createdAt: now,
    updatedAt: now,
  });
}

/** Fetch a user doc once. Returns null if it doesn't exist. */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/**
 * Subscribe to live updates of a user doc.
 * Returns the unsubscribe function — call it on unmount.
 */
export function subscribeUserDoc(
  uid: string,
  cb: (u: UserDoc | null) => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserDoc) : null);
  });
}

/**
 * Update mutable fields on a user doc.
 * The security rule prevents `isOwner`, `uid`, and `email` from being changed.
 */
export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserDoc, 'displayName' | 'photoUrl'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}
