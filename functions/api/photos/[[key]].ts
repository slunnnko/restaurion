import { PagesContext, jsonResponse } from '../_shared';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const onRequestGet = async (context: PagesContext<{ key: string | string[] }>) => {
  const rawKey = context.params.key;
  const key = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;

  if (!key) {
    return jsonResponse({ error: 'Chybí klíč fotografie.' }, 400);
  }

  // 1. Kontrola v Cloudflare Edge CDN Cache
  const cacheStorage = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(context.request.url, context.request);

  if (cacheStorage) {
    const cachedResponse = await cacheStorage.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // 2. Čtení z Cloudflare R2 bucketu (pokud je připojen)
  if (context.env.PHOTOS) {
    const object = await context.env.PHOTOS.get(key);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.etag);
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/webp');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      const response = new Response(object.body, { status: 200, headers });
      if (cacheStorage) {
        context.waitUntil(cacheStorage.put(cacheKey, response.clone()));
      }
      return response;
    }
  }

  // 3. Fallback čtení z Cloudflare D1 (tabulka photos)
  if (context.env.DB) {
    const row = await context.env.DB
      .prepare(`SELECT content_type, data_base64 FROM photos WHERE key = ? LIMIT 1`)
      .bind(key)
      .first<{ content_type: string; data_base64: string }>();

    if (row) {
      const bytes = base64ToUint8Array(row.data_base64);
      const response = new Response(bytes.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': row.content_type || 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
      if (cacheStorage) {
        context.waitUntil(cacheStorage.put(cacheKey, response.clone()));
      }
      return response;
    }
  }

  return jsonResponse({ error: 'Fotografie nebyla nalezena.' }, 404);
};

