import { PagesContext, jsonResponse, sha256Hex } from '../_shared';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export const onRequestPost = async (context: PagesContext) => {
  try {
    const formData = await context.request.formData();
    const file = formData.get('file');
    const folderRaw = (formData.get('folder') as string) || 'jobs';
    const folder = folderRaw === 'avatars' ? 'avatars' : 'jobs';

    if (!file || typeof file === 'string' || !('arrayBuffer' in file)) {
      return jsonResponse({ error: 'Nebyl přiložen žádný soubor obrázku.' }, 400);
    }

    const blob = file as Blob;
    if (blob.size > 2 * 1024 * 1024) {
      return jsonResponse({ error: 'Obrázek je příliš velký (max 2 MB po kompresi).' }, 413);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const hash = (await sha256Hex(arrayBuffer)).slice(0, 32);
    const contentType = blob.type || 'image/webp';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'webp';
    const key = `${folder}/${hash}.${ext}`;

    // 1. Primární uložení do Cloudflare R2 (pokud je připojen bucket PHOTOS)
    if (context.env.PHOTOS) {
      await context.env.PHOTOS.put(key, arrayBuffer, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
      return jsonResponse({ url: `/api/photos/${key}`, key, storage: 'r2' }, 201);
    }

    // 2. Automatický fallback do Cloudflare D1 (tabulka photos), pokud R2 není připojen
    if (context.env.DB) {
      const base64Data = arrayBufferToBase64(arrayBuffer);
      await context.env.DB
        .prepare(
          `INSERT OR IGNORE INTO photos (key, content_type, data_base64, size_bytes)
           VALUES (?, ?, ?, ?)`
        )
        .bind(key, contentType, base64Data, arrayBuffer.byteLength)
        .run();

      return jsonResponse({ url: `/api/photos/${key}`, key, storage: 'd1' }, 201);
    }

    return jsonResponse({ error: 'Není připojeno úložiště R2 ani D1.' }, 503);
  } catch (err) {
    console.error('Chyba při nahrávání fotky:', err);
    return jsonResponse({ error: 'Nepodařilo se uložit fotografii.' }, 500);
  }
};

