// Shared by server middleware and the server-only executor. No database or secrets.
export const PHYSICAL_991_OPERATION = "remediate_991_physical";
export const PHYSICAL_991_PATH = "/api/admin/remediate-991-physical";
export const PHYSICAL_991_ORIGIN = "https://app.digitalgate.com.au";

// A network POST can have a stream even when it carries zero bytes. Cache only
// the body result so repeated endpoint checks still revalidate headers and URL.
const emptyBodies = new WeakMap<Request, Promise<boolean>>();
const EMPTY_BODY_TIMEOUT_MS = 1000;

async function readEmptyBody(request: Request): Promise<boolean> {
  if (request.signal.aborted || request.bodyUsed) return false;
  if (request.body === null) return true;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try { reader = request.body.getReader(); } catch { return false; }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        // Bound empty chunks too, so a pathological stream cannot starve timers.
        for (let chunks = 0; chunks < 16; chunks++) {
          const { done, value } = await reader.read();
          if (request.signal.aborted) return false;
          if (done) return true;
          // Zero bytes allowed: reject the first non-empty chunk without buffering.
          if (!(value instanceof Uint8Array) || value.byteLength !== 0) return false;
        }
        return false;
      })(),
      new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), EMPTY_BODY_TIMEOUT_MS); }),
    ]);
  } catch { return false; }
  finally {
    clearTimeout(timer);
    // Cancellation may itself stall; never wait for an untrusted stream's cancel.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function physical991Envelope(request: Request): Promise<boolean> {
  if (request.method !== "POST" || request.url !== PHYSICAL_991_ORIGIN + PHYSICAL_991_PATH
    || request.headers.get("Origin") !== PHYSICAL_991_ORIGIN || request.headers.has("X-API-Key")
    || request.signal.aborted) return false;
  let empty = emptyBodies.get(request);
  if (!empty) { empty = readEmptyBody(request); emptyBodies.set(request, empty); }
  return await empty && !request.signal.aborted;
}

export type Physical991Audit = {
  operation: typeof PHYSICAL_991_OPERATION; requestId: string; timestamp: string;
  actor: string | null; outcome: "attempt" | "success" | "refused" | "ambiguous";
};

// Only an explicit allowlisted shape is emitted. Never pass errors or request objects.
export function auditPhysical991(event: Physical991Audit): void {
  console.info(JSON.stringify({ operation: PHYSICAL_991_OPERATION, requestId: event.requestId,
    timestamp: event.timestamp, actor: event.actor, outcome: event.outcome }));
}

export function physical991Response(status: 200 | 403, requestId: string): Response {
  return Response.json({ ok: status === 200, operation: PHYSICAL_991_OPERATION }, {
    status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-DG-Request-ID": requestId },
  });
}

export function refusePhysical991(): Response {
  const requestId = crypto.randomUUID();
  auditPhysical991({ operation: PHYSICAL_991_OPERATION, requestId, timestamp: new Date().toISOString(), actor: null, outcome: "refused" });
  return physical991Response(403, requestId);
}

// Clerk can produce a handshake redirect before its callback. Convert it to the
// same refusal rather than forwarding any redirect/error/rewrite for this route.
export function physical991AuthResponse(response: Response | void | null): Response | undefined {
  if (response && (response.status !== 200 || response.headers.has("Location")
    || response.headers.has("X-Middleware-Rewrite") || response.headers.has("X-Nextjs-Redirect"))) return refusePhysical991();
  return response || undefined;
}
