/**
 * Klientská komprese a zmenšení obrázků do formátu WebP před nahráním do Cloudflare R2 (nebo jako malý Data URL fallback).
 * Zmenší fotku z telefonu (5–10 MB) na ~50–100 KB při zachování ostrosti detailů řemeslné práce.
 */
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImageToWebP(
  file: File,
  options: CompressOptions = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  const maxWidth = options.maxWidth ?? 1200;
  const maxHeight = options.maxHeight ?? 1200;
  const quality = options.quality ?? 0.82;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nepodařilo se načíst soubor obrázku.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Nepodařilo se dekódovat obrázek.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Prohlížeč nepodporuje 2D plátno pro kompresi obrázků.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Komprese do WebP selhala.'));
              return;
            }
            resolve({ blob, dataUrl });
          },
          'image/webp',
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Nahraje zkomprimovaný obrázek na Cloudflare R2 přes Pages Function `/api/photos/upload`.
 * Pokud endpoint není dostupný (např. čistě statický offline režim), vrátí zkomprimovaný WebP dataUrl.
 */
export async function uploadCompressedImage(
  file: File,
  folder: 'jobs' | 'avatars' = 'jobs'
): Promise<string> {
  const maxDim = folder === 'avatars' ? 400 : 1200;
  const { blob, dataUrl } = await compressImageToWebP(file, {
    maxWidth: maxDim,
    maxHeight: maxDim,
    quality: 0.82,
  });

  try {
    const formData = new FormData();
    formData.append('file', blob, `${folder}.webp`);
    formData.append('folder', folder);

    const res = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        return data.url;
      }
    }
  } catch {
    // Fallback na malý zkomprimovaný WebP dataUrl (~50 KB)
  }

  return dataUrl;
}

