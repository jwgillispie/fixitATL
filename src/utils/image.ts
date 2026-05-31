/**
 * Client-side image compression.
 *
 * Resizes to MAX_IMAGE_DIMENSION on the long edge, encodes JPEG at
 * step-down quality until under MAX_IMAGE_BYTES. Handles iOS Safari's
 * occasional `canvas.toBlob` returning null on first paint by awaiting
 * `img.onload` before drawing.
 */

import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION } from '@/lib/constants';

export async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const { width, height } = scaleDown(img.width, img.height, MAX_IMAGE_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', q),
    );
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
    if (q === 0.45 && blob) return blob;
  }
  throw new Error('Failed to compress image');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function scaleDown(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
