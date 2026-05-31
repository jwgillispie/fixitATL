/**
 * Fix-ATL constants.
 *
 * Keep this file framework-agnostic — no React imports, no Firebase imports.
 * Brand tokens here are also reflected in globals.css as CSS variables.
 */

export const ATLANTA_CENTER = { lat: 33.749, lng: -84.388 } as const;
export const DEFAULT_MAP_ZOOM = 12;

/** Reuse hipop's Cloud Run Places proxy — same backend Flutter app uses. */
export const PLACES_PROXY_URL =
  'https://hipop-places-server-977869241732.us-central1.run.app/api/places';

/** Image compression targets — must align with storage.rules MB limit. */
export const MAX_IMAGE_BYTES = 1_500_000; // 1.5 MB
export const MAX_IMAGE_DIMENSION = 1600;  // px on the long edge
export const STORAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard cap (also in storage.rules)

/**
 * Admin/owner email allowlist.
 *
 * SINGLE SOURCE OF TRUTH — must match the same list inside firestore.rules
 * and storage.rules. To add an admin: add their email here AND in both
 * .rules files, then `firebase deploy --only firestore:rules,storage`.
 */
export const ADMIN_EMAILS: readonly string[] = [
  'hipopmarkets@gmail.com',
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Brand colors — keep in sync with globals.css and the mockups. */
export const BRAND = {
  name: 'Fix-ATL',
  tagline: "We're fixing Atlanta, one missing drain cover at a time.",
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  ink: '#0A0A0A',
  accent: '#E94E1B',
  accentDeep: '#B83A0F',
  fixed: '#166534',
  broken: '#991B1B',
  pending: '#92400E',
} as const;
