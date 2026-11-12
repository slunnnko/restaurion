// Tenký wrapper nad fetch pro /api/* (stejný origin, cookie session).

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  // FormData (nahrání dokumentu) se posílá beze změny; prohlížeč sám doplní multipart hranici.
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  try {
    res = await fetch(path, {
      method: init?.method ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: init?.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'Server není dostupný. Zkontroluj připojení a zkus to znovu.');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // prázdné nebo nevalidní tělo
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; fieldErrors?: Record<string, string> };
    throw new ApiError(res.status, d.error || `Chyba serveru (${res.status}).`, d.fieldErrors);
  }
  return data as T;
}
