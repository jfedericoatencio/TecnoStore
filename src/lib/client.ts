'use client';
// Helper de fetch para el panel: JSON + manejo de errores +
// redirección automática si la sesión expiró.
export async function api<T = any>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = options ?? {};
  const res = await fetch(url, {
    ...rest,
    headers:
      json !== undefined
        ? { 'Content-Type': 'application/json', ...(rest.headers ?? {}) }
        : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && url.startsWith('/api/admin') && typeof window !== 'undefined') {
    window.location.href = '/admin/login?expirada=1';
    throw new Error('Sesión expirada');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const err: any = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
