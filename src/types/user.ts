/**
 * UserDoc — Firestore `users/{uid}` document shape.
 *
 * IMPORTANT (per CLAUDE.md):
 *   - Field names are camelCase, exactly as written. Do not rename.
 *   - All timestamps are Firestore `Timestamp` (not `Date` or millis).
 *   - `null` is used explicitly for optional fields — never omit keys.
 *   - `isOwner` MUST be `false` on create. It can only be flipped to `true`
 *     manually in the Firebase Console — security rules enforce this.
 *
 * Source of truth: FIXATL_MVP_PLAN.md §6.1
 */

import type { Timestamp } from 'firebase/firestore';

export interface UserDoc {
  /** Matches the document ID (which matches Firebase Auth uid). Denormalized for convenience. */
  uid: string;

  /** Email from Firebase Auth. Set at signup, immutable per security rules. */
  email: string;

  /** Display name chosen at signup. Editable by the user. */
  displayName: string;

  /** URL to avatar in Storage (`users/{uid}/avatar.jpg`), or null if not uploaded. */
  photoUrl: string | null;

  /**
   * Owner flag. Defaults to false on creation.
   * Manually flipped to true in Firebase Console by an admin.
   * Security rules prevent users from setting this themselves.
   */
  isOwner: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
