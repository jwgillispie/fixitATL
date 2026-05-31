/**
 * Reports service — all reads and writes for `reports/{reportId}` go through this file.
 *
 * CRITICAL (per CLAUDE.md):
 *   - Every field name is camelCase, exactly matching ReportDoc in @/types/report.
 *   - Denormalized fields (createdByDisplayName, createdByPhotoUrl, fixedByDisplayName)
 *     are snapshotted at write time. Don't try to join.
 *   - Status transitions only move forward. Owners can correct via delete+recreate.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ReportDoc, ReportStatus, ReportCategory } from '@/types/report';
import { compressImage } from '@/utils/image';
import { uploadReportPhoto, deleteStoragePath } from './storage';

// ============================================================================
// Write — submit (regular user)
// ============================================================================

export interface SubmitReportInput {
  beforeFile: File;
  title: string;
  description: string;
  category: ReportCategory;
  location: ReportLocation;
  user: ReportSubmitter;
}

export interface ReportLocation {
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
}

export interface ReportSubmitter {
  uid: string;
  displayName: string;
  photoUrl: string | null;
}

/**
 * Member submits a broken-thing report.
 * Pre-generates the report ID, uploads the photo to storage at that ID, then
 * writes the Firestore doc. Status starts as 'pending' — waits for owner approval.
 */
export async function submitReport(input: SubmitReportInput): Promise<string> {
  const newRef = doc(collection(db, 'reports'));
  const reportId = newRef.id;
  // eslint-disable-next-line no-console
  console.log('[FIXATL][submit] start', { reportId, uid: input.user.uid, title: input.title });

  let blob: Blob;
  try {
    blob = await compressImage(input.beforeFile);
    // eslint-disable-next-line no-console
    console.log('[FIXATL][submit] compressed', { bytes: blob.size, type: blob.type });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[FIXATL][submit] compressImage FAILED', e);
    throw e;
  }

  let url: string, path: string;
  try {
    ({ url, path } = await uploadReportPhoto(reportId, 'before', blob));
    // eslint-disable-next-line no-console
    console.log('[FIXATL][submit] uploaded', { url, path });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[FIXATL][submit] uploadReportPhoto FAILED', e);
    throw e;
  }

  try {
    await setDoc(newRef, {
    id: reportId,
    status: 'pending' as ReportStatus,
    category: input.category,
    beforePhotoUrl: url,
    beforePhotoStoragePath: path,
    afterPhotoUrl: null,
    afterPhotoStoragePath: null,
    title: input.title.trim().slice(0, 80),
    description: input.description.trim().slice(0, 500),
    address: input.location.address,
    neighborhood: input.location.neighborhood,
    city: input.location.city,
    state: input.location.state,
    zipCode: input.location.zipCode,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    placeId: input.location.placeId,
    createdBy: input.user.uid,
    createdByDisplayName: input.user.displayName,
    createdByPhotoUrl: input.user.photoUrl,
    fixedBy: null,
    fixedByDisplayName: null,
    approvedAt: null,
    fixedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
    // eslint-disable-next-line no-console
    console.log('[FIXATL][submit] setDoc OK — report saved', { reportId });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[FIXATL][submit] setDoc FAILED — likely Firestore rules', e);
    throw e;
  }

  return reportId;
}

// ============================================================================
// Write — owner direct post
// ============================================================================

export interface OwnerCreateReportInput extends SubmitReportInput {
  afterFile: File | null;
}

/**
 * Owner posts a fix directly — bypassing the approval queue.
 * If afterFile is provided, status='fixed' and the after photo is uploaded.
 * Otherwise status='approved' (broken thing seen in the field, no fix yet).
 */
export async function ownerCreateReport(input: OwnerCreateReportInput): Promise<string> {
  const newRef = doc(collection(db, 'reports'));
  const reportId = newRef.id;

  const beforeBlob = await compressImage(input.beforeFile);
  const before = await uploadReportPhoto(reportId, 'before', beforeBlob);

  let after: { url: string; path: string } | null = null;
  if (input.afterFile) {
    const afterBlob = await compressImage(input.afterFile);
    after = await uploadReportPhoto(reportId, 'after', afterBlob);
  }

  const isFixed = !!input.afterFile;
  await setDoc(newRef, {
    id: reportId,
    status: (isFixed ? 'fixed' : 'approved') as ReportStatus,
    category: input.category,
    beforePhotoUrl: before.url,
    beforePhotoStoragePath: before.path,
    afterPhotoUrl: after?.url ?? null,
    afterPhotoStoragePath: after?.path ?? null,
    title: input.title.trim().slice(0, 80),
    description: input.description.trim().slice(0, 500),
    address: input.location.address,
    neighborhood: input.location.neighborhood,
    city: input.location.city,
    state: input.location.state,
    zipCode: input.location.zipCode,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    placeId: input.location.placeId,
    createdBy: input.user.uid,
    createdByDisplayName: input.user.displayName,
    createdByPhotoUrl: input.user.photoUrl,
    fixedBy: isFixed ? input.user.uid : null,
    fixedByDisplayName: isFixed ? input.user.displayName : null,
    approvedAt: serverTimestamp(),
    fixedAt: isFixed ? serverTimestamp() : null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reportId;
}

// ============================================================================
// Write — owner moderation
// ============================================================================

export async function approveReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectReport(reportId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
    rejectionReason: reason.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Owner marks an approved report as fixed by uploading the after photo.
 * Updates the existing doc — does NOT create a new one.
 */
export async function markReportFixed(
  reportId: string,
  afterFile: File,
  owner: { uid: string; displayName: string },
): Promise<void> {
  const blob = await compressImage(afterFile);
  const { url, path } = await uploadReportPhoto(reportId, 'after', blob);
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'fixed',
    afterPhotoUrl: url,
    afterPhotoStoragePath: path,
    fixedBy: owner.uid,
    fixedByDisplayName: owner.displayName,
    fixedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Owner deletes a report. Also deletes the storage files (best-effort). */
export async function deleteReport(report: ReportDoc): Promise<void> {
  await deleteStoragePath(report.beforePhotoStoragePath);
  if (report.afterPhotoStoragePath) {
    await deleteStoragePath(report.afterPhotoStoragePath);
  }
  await deleteDoc(doc(db, 'reports', report.id));
}

// ============================================================================
// Read
// ============================================================================

export async function getReport(reportId: string): Promise<ReportDoc | null> {
  const snap = await getDoc(doc(db, 'reports', reportId));
  return snap.exists() ? (snap.data() as ReportDoc) : null;
}

export interface FeedFilter {
  /** Which statuses to include. Public callers should pass ['approved','fixed']. */
  statuses: ReportStatus[];
  category?: ReportCategory;
  pageSize?: number;
}

/** Subscribe to the public feed. Returns unsubscribe. */
export function subscribeFeed(
  filter: FeedFilter,
  cb: (reports: ReportDoc[]) => void,
): Unsubscribe {
  const constraints: QueryConstraint[] = [where('status', 'in', filter.statuses)];
  if (filter.category) constraints.push(where('category', '==', filter.category));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(filter.pageSize ?? 100));
  const q = query(collection(db, 'reports'), ...constraints);
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as ReportDoc)));
}

/** All reports submitted by a given user (all statuses, sorted newest first). */
export async function getReportsForUser(uid: string): Promise<ReportDoc[]> {
  const q = query(
    collection(db, 'reports'),
    where('createdBy', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  // eslint-disable-next-line no-console
  console.log('[FIXATL][account] getReportsForUser', { uid });
  try {
    const snap = await getDocs(q);
    // eslint-disable-next-line no-console
    console.log('[FIXATL][account] getReportsForUser → got', {
      count: snap.docs.length,
      statuses: snap.docs.map((d) => (d.data() as ReportDoc).status),
    });
    return snap.docs.map((d) => d.data() as ReportDoc);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[FIXATL][account] getReportsForUser FAILED', e);
    throw e;
  }
}

/** All reports that a given owner marked as fixed (for owner profile page). */
export async function getReportsFixedBy(uid: string): Promise<ReportDoc[]> {
  const q = query(
    collection(db, 'reports'),
    where('fixedBy', '==', uid),
    orderBy('fixedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ReportDoc);
}

/** Live subscription to the owner approval queue. Returns unsubscribe. */
export function subscribePendingQueue(cb: (reports: ReportDoc[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'reports'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  );
  // eslint-disable-next-line no-console
  console.log('[FIXATL][queue] subscribePendingQueue starting');
  return onSnapshot(
    q,
    (snap) => {
      // eslint-disable-next-line no-console
      console.log('[FIXATL][queue] snapshot', {
        count: snap.docs.length,
        ids: snap.docs.map((d) => d.id),
      });
      cb(snap.docs.map((d) => d.data() as ReportDoc));
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[FIXATL][queue] subscription ERROR — likely missing index or rules', err);
    },
  );
}
