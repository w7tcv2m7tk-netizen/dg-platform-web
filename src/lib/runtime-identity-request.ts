// No database, page context, secrets or Node-only imports: also used by middleware.
export const IDENTITY_PATH = '/api/admin/runtime-database-identity';
export const IDENTITY_ORIGIN = 'https://app.digitalgate.com.au';

export async function identityEnvelope(request: Request): Promise<boolean> {
  if (request.method !== 'POST' || request.url !== IDENTITY_ORIGIN + IDENTITY_PATH ||
      request.headers.get('Origin') !== IDENTITY_ORIGIN || request.headers.has('X-API-Key') ||
      request.signal.aborted || request.bodyUsed) return false;
  if (!request.body) return true;
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        for (let i = 0; i < 16; i++) {
          const { done, value } = await reader.read();
          if (request.signal.aborted) return false;
          if (done) return true;
          if (!(value instanceof Uint8Array) || value.length !== 0) return false;
        }
        return false;
      })(),
      new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), 1000); }),
    ]);
  } catch { return false; }
  finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function identityRefusal(): Response {
  return Response.json({ status: 'denied' }, { status: 403, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}

export function identityAuthResponse(response: Response | null | void): Response | undefined {
  if (response && (response.status !== 200 || response.headers.has('Location') ||
      response.headers.has('X-Middleware-Rewrite') || response.headers.has('X-Nextjs-Redirect'))) return identityRefusal();
  return response || undefined;
}
