// Shared by server middleware and the server-only executor. No database or secrets.
export const PHYSICAL_991_OPERATION = "remediate_991_physical";
export const PHYSICAL_991_PATH = "/api/admin/remediate-991-physical";
export const PHYSICAL_991_ORIGIN = "https://app.digitalgate.com.au";

export function physical991Envelope(request: Request): boolean {
  return request.method === "POST" && request.url === PHYSICAL_991_ORIGIN + PHYSICAL_991_PATH
    && request.headers.get("Origin") === PHYSICAL_991_ORIGIN && request.body === null
    && !request.headers.has("X-API-Key");
}

export type Physical991Audit = {
  operation: typeof PHYSICAL_991_OPERATION; requestId: string; timestamp: string;
  actor: string | null; outcome: "attempt" | "success" | "refused";
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
