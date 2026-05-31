/**
 * ReportDoc — Firestore `reports/{reportId}` document shape.
 *
 * IMPORTANT (per CLAUDE.md):
 *   - Field names are camelCase, exactly as written. Do not rename.
 *   - All timestamps are Firestore `Timestamp` (not `Date` or millis).
 *   - `null` is used explicitly for optional fields — never omit keys.
 *   - Denormalized fields (createdByDisplayName, createdByPhotoUrl, fixedByDisplayName)
 *     are snapshotted at write time so feed cards don't need user-doc joins.
 *
 * Source of truth: FIXATL_MVP_PLAN.md §6.2
 */

import type { Timestamp } from 'firebase/firestore';

/** Closed set. Do not extend without a Firestore migration. */
export type ReportStatus = 'pending' | 'approved' | 'fixed' | 'rejected';

/** Closed set. Do not extend without a Firestore migration. */
export type ReportCategory =
  | 'pothole'
  | 'drain_cover'
  | 'water_meter_lid'
  | 'sidewalk'
  | 'sign'
  | 'graffiti'
  | 'other';

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  pothole: 'Pothole',
  drain_cover: 'Drain Cover',
  water_meter_lid: 'Water Meter Lid',
  sidewalk: 'Sidewalk',
  sign: 'Sign',
  graffiti: 'Graffiti',
  other: 'Other',
};

export const REPORT_CATEGORY_EMOJI: Record<ReportCategory, string> = {
  pothole: '🕳️',
  drain_cover: '⭕',
  water_meter_lid: '💧',
  sidewalk: '🚧',
  sign: '🪧',
  graffiti: '🖌️',
  other: '❓',
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  'pothole',
  'drain_cover',
  'water_meter_lid',
  'sidewalk',
  'sign',
  'graffiti',
  'other',
];

export interface ReportDoc {
  /** Matches the document ID. Denormalized for serialization to the client. */
  id: string;

  status: ReportStatus;
  category: ReportCategory;

  // ---- Photos ----
  /** Required public download URL of the "before" photo. */
  beforePhotoUrl: string;
  /** Storage path (e.g. `reports/abc123/before.jpg`) — used for cleanup on delete. */
  beforePhotoStoragePath: string;
  /** Set when status becomes 'fixed'. Null otherwise. */
  afterPhotoUrl: string | null;
  afterPhotoStoragePath: string | null;

  // ---- Description ----
  /** 1–80 chars, required. */
  title: string;
  /** Optional. Default to empty string '' on creation, never null. Max 500 chars. */
  description: string;

  // ---- Location (from Google Places) ----
  /** formatted_address from Places API. */
  address: string;
  /** Best-effort from sublocality, e.g. "Old Fourth Ward". May be null. */
  neighborhood: string | null;
  /** Expected "Atlanta" but not validated. */
  city: string;
  /** Expected "GA" but not validated. */
  state: string;
  zipCode: string | null;
  /** Required. Used by the map. */
  latitude: number;
  /** Required. Used by the map. */
  longitude: number;
  /** Google Place ID for re-lookup. May be null. */
  placeId: string | null;

  // ---- People (denormalized from users/{uid} at write time) ----
  /** Submitter's Firebase Auth uid. */
  createdBy: string;
  /** Snapshot of submitter's displayName at submit time. */
  createdByDisplayName: string;
  /** Snapshot of submitter's photoUrl at submit time. May be null. */
  createdByPhotoUrl: string | null;
  /** Owner uid who marked it fixed. Null until status='fixed'. */
  fixedBy: string | null;
  /** Snapshot of the fixing owner's displayName. Null until status='fixed'. */
  fixedByDisplayName: string | null;

  // ---- Timestamps ----
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedAt: Timestamp | null;
  fixedAt: Timestamp | null;
  rejectedAt: Timestamp | null;

  // ---- Moderation ----
  /** Visible to submitter when status='rejected'. Null otherwise. */
  rejectionReason: string | null;
}
