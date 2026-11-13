// Fotky inzerátu v UI i na serveru (D45): seznam fotek s náhradou za starý jediný `image_url`.

/** Fake id of a legacy photo (`jobs.image_url` without a `job_photos` row); DELETE /photos/legacy clears `image_url`. */
export const LEGACY_PHOTO_ID = 'legacy';

/** Photos of a listing in display order; a legacy `imageUrl` alone becomes one photo with the fake id. */
export function jobPhotoList(job: { photos?: { id: string; url: string }[]; imageUrl?: string }): { id: string; url: string }[] {
  if (job.photos && job.photos.length > 0) return job.photos;
  return job.imageUrl ? [{ id: LEGACY_PHOTO_ID, url: job.imageUrl }] : [];
}
