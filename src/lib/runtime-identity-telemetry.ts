import { IDENTITY_PATH } from './runtime-identity-request';

/** Diagnostic HTTP telemetry is suppressed; its durable control audit is separate.
 * This avoids sending the one-use header in request/span metadata. Other routes
 * retain their existing events. Defence in depth also strips the custom header
 * from an unrelated event if somebody sends it to a different route.
 */
export function identitySafeTelemetry<T extends {
  request?: { url?: string; headers?: Record<string,string> }; transaction?: string;
}>(event: T): T | null {
  try {
    if (event.transaction?.includes(IDENTITY_PATH) ||
        event.request?.url && new URL(event.request.url,'https://app.digitalgate.com.au').pathname === IDENTITY_PATH) return null;
    const headers=event.request?.headers;
    if (!headers || !Object.keys(headers).some(k=>k.toLowerCase()==='x-dg-identity-token')) return event;
    return { ...event,request:{...event.request,headers:Object.fromEntries(
      Object.entries(headers).filter(([k])=>k.toLowerCase()!=='x-dg-identity-token'))} };
  } catch { return null; }
}
