// Fotka inzerátu: zmenšení v prohlížeči před nahráním a odeslání na /api/jobs/:id/photos (D45: až 6 fotek).

import type { PublicJob } from '@/types/api';
import { ApiError } from './api';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Downscales to max 1600 px on the longest side and re-encodes as WebP 0.82 (JPEG where toBlob has no WebP). */
export async function downscaleImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Soubor se nepodařilo přečíst jako obrázek.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Obrázek se nepodařilo zpracovat.');
  // Fill white first: a transparent PNG/WebP would turn black in the JPEG fallback.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let blob = await toBlob(canvas, 'image/webp', 0.82);
  // Old Safari ignores the WebP request and returns PNG; the server accepts it, but JPEG is far smaller.
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.82);
  if (!blob) throw new Error('Obrázek se nepodařilo zpracovat.');
  if (blob.size > MAX_PHOTO_BYTES) throw new Error('Fotka je i po zmenšení větší než 5 MB. Vyber menší obrázek.');
  return blob;
}

async function photoRequest(url: string, init: RequestInit): Promise<PublicJob> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'Server není dostupný. Zkontroluj připojení a zkus to znovu.');
  }
  let data: { job?: PublicJob; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    // prázdné tělo
  }
  if (!res.ok || !data?.job) throw new ApiError(res.status, data?.error || `Chyba serveru (${res.status}).`);
  return data.job;
}

/** Raw bytes with the blob's own Content-Type (the server decides by magic bytes anyway). */
export const uploadJobPhoto = (jobId: string, blob: Blob) =>
  photoRequest(`/api/jobs/${encodeURIComponent(jobId)}/photos`, { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });

export const deleteJobPhoto = (jobId: string, photoId: string) =>
  photoRequest(`/api/jobs/${encodeURIComponent(jobId)}/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
