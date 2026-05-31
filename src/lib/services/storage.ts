/**
 * Storage service — all uploads to Firebase Storage go through this file.
 *
 * Paths are locked (must match storage.rules):
 *   reports/{reportId}/before.jpg
 *   reports/{reportId}/after.jpg
 *   users/{uid}/avatar.jpg
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface UploadedPhoto {
  url: string;
  path: string;
}

export async function uploadReportPhoto(
  reportId: string,
  which: 'before' | 'after',
  blob: Blob,
): Promise<UploadedPhoto> {
  const path = `reports/${reportId}/${which}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function uploadAvatar(uid: string, blob: Blob): Promise<string> {
  const r = ref(storage, `users/${uid}/avatar.jpg`);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

export async function deleteStoragePath(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    // Don't break the parent operation if the file is already gone.
    console.warn('Storage delete failed:', path, e);
  }
}
