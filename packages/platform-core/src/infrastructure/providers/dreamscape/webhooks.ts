import { createHash, timingSafeEqual } from "node:crypto";

import type { DomainStatus } from "../../core/types";

/**
 * Dreamscape Reseller Console → DigitalGate webhook (domain transfer notifications).
 *
 * Public REST API docs do not define an inbound webhook signature scheme.
 * We verify with shared secret `DREAMSCAPE_WEBHOOK_SECRET` via:
 *   - query `?secret=` / `?token=` (paste into Notification URL — console often can't set headers)
 *   - headers: X-Dreamscape-Webhook-Secret | X-Webhook-Secret | Authorization: Bearer …
 *
 * Never reuse DREAMSCAPE_API_KEY as the webhook secret.
 */

export const DREAMSCAPE_WEBHOOK_PATH = "/api/webhooks/dreamscape";

const MAX_STORED_EVENTS = 200;

export type DreamscapeWebhookEventKind =
  | "domain.transfer"
  | "domain.status"
  | "domain.unknown"
  | "unknown";

export interface DreamscapeWebhookEventStub {
  id: string;
  receivedAt: string;
  kind: DreamscapeWebhookEventKind;
  domainName: string | null;
  statusId: number | null;
  statusLabel: string | null;
  mappedStatus: DomainStatus | null;
  providerEventId: string | null;
  /** Sanitized payload subset — no secrets */
  summary: Record<string, unknown>;
  rawKeys: string[];
}

export interface HandleDreamscapeWebhookResult {
  received: true;
  event: DreamscapeWebhookEventStub;
  handled: boolean;
  note: string;
}

const eventStore: DreamscapeWebhookEventStub[] = [];

export function listDreamscapeWebhookEvents(): DreamscapeWebhookEventStub[] {
  return [...eventStore];
}

export function clearDreamscapeWebhookEvents(): void {
  eventStore.length = 0;
}

function pushEvent(event: DreamscapeWebhookEventStub): void {
  eventStore.unshift(event);
  if (eventStore.length > MAX_STORED_EVENTS) {
    eventStore.length = MAX_STORED_EVENTS;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function resolveDreamscapeWebhookSecret(): string {
  return process.env.DREAMSCAPE_WEBHOOK_SECRET?.trim() ?? "";
}

export function isDreamscapeWebhookConfigured(): boolean {
  return Boolean(resolveDreamscapeWebhookSecret());
}

/**
 * Extract shared secret from request URL + headers.
 * Prefer query secret so Reseller Console Notification URL works without custom headers.
 */
export function extractDreamscapeWebhookSecret(req: Request): string {
  const url = new URL(req.url);
  const fromQuery =
    url.searchParams.get("secret")?.trim() ||
    url.searchParams.get("token")?.trim() ||
    "";
  if (fromQuery) return fromQuery;

  const header =
    req.headers.get("X-Dreamscape-Webhook-Secret")?.trim() ||
    req.headers.get("X-Webhook-Secret")?.trim() ||
    "";
  if (header) return header;

  const auth = req.headers.get("Authorization")?.trim() ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

export function verifyDreamscapeWebhookRequest(req: Request): {
  ok: boolean;
  reason?: string;
} {
  const expected = resolveDreamscapeWebhookSecret();
  if (!expected) {
    return {
      ok: false,
      reason: "DREAMSCAPE_WEBHOOK_SECRET is not configured",
    };
  }
  const provided = extractDreamscapeWebhookSecret(req);
  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, reason: "invalid webhook secret" };
  }
  return { ok: true };
}

/** Dreamscape domain status ids (docs predefined values). */
const STATUS_BY_ID: Record<number, { label: string; mapped: DomainStatus }> = {
  1: { label: "Awaiting Registration", mapped: "pending" },
  2: { label: "Registered", mapped: "registered" },
  3: { label: "Awaiting Renewal", mapped: "registered" },
  4: { label: "Awaiting Deleted", mapped: "pending" },
  5: { label: "Deleted", mapped: "unavailable" },
  6: { label: "Expired", mapped: "expired" },
  7: { label: "Awaiting Transfer In", mapped: "transferring" },
  8: { label: "Awaiting Transfer Out", mapped: "transferring" },
  9: { label: "Error", mapped: "unknown" },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickNumber(
  obj: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

function mergeLayers(body: unknown): Record<string, unknown> {
  const root = asRecord(body) ?? {};
  const layers = [root];
  for (const key of ["data", "payload", "domain", "notification", "event"]) {
    const nested = asRecord(root[key]);
    if (nested) layers.push(nested);
  }
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    Object.assign(merged, layer);
  }
  return merged;
}

function inferKind(
  merged: Record<string, unknown>,
  statusId: number | null,
): DreamscapeWebhookEventKind {
  const eventHint = (
    pickString(merged, [
      "event",
      "event_type",
      "eventType",
      "type",
      "notification",
      "action",
      "name",
    ]) ?? ""
  ).toLowerCase();

  if (
    statusId === 7 ||
    statusId === 8 ||
    eventHint.includes("transfer") ||
    eventHint.includes("transfer_in") ||
    eventHint.includes("transfer_out")
  ) {
    return "domain.transfer";
  }

  if (
    statusId != null ||
    pickString(merged, ["domain", "domain_name", "domainName", "fqdn"])
  ) {
    return statusId != null ? "domain.status" : "domain.unknown";
  }

  return "unknown";
}

function eventIdFrom(merged: Record<string, unknown>, rawBody: string): string {
  const providerId = pickString(merged, [
    "id",
    "event_id",
    "eventId",
    "notification_id",
    "notificationId",
    "request_id",
    "requestId",
  ]);
  if (providerId) {
    return `ds_${providerId}`;
  }
  const hash = createHash("sha256")
    .update(rawBody || JSON.stringify(merged))
    .digest("hex")
    .slice(0, 16);
  return `ds_${Date.now()}_${hash}`;
}

/**
 * Parse + acknowledge a Dreamscape notification.
 * Prefer handleDreamscapeWebhookPayloadAsync so inventory status can update.
 */
export function handleDreamscapeWebhookPayload(
  body: unknown,
  rawBody = "",
): HandleDreamscapeWebhookResult {
  const merged = mergeLayers(body);
  const domainName = pickString(merged, [
    "domain_name",
    "domainName",
    "domain",
    "fqdn",
    "name",
  ]);
  const statusId = pickNumber(merged, [
    "status_id",
    "statusId",
    "domain_status_id",
    "domainStatusId",
    "status",
  ]);
  const statusMeta = statusId != null ? STATUS_BY_ID[statusId] : undefined;
  const statusLabel =
    statusMeta?.label ??
    pickString(merged, ["status_name", "statusName", "status_label"]);
  const kind = inferKind(merged, statusId);
  const providerEventId = pickString(merged, [
    "id",
    "event_id",
    "eventId",
    "notification_id",
    "notificationId",
  ]);

  const summary: Record<string, unknown> = {};
  for (const key of [
    "domain",
    "domain_name",
    "domainName",
    "status",
    "status_id",
    "statusId",
    "event",
    "event_type",
    "eventType",
    "type",
    "message",
    "customer_id",
    "customerId",
  ]) {
    if (merged[key] !== undefined) summary[key] = merged[key];
  }

  const event: DreamscapeWebhookEventStub = {
    id: eventIdFrom(merged, rawBody),
    receivedAt: new Date().toISOString(),
    kind,
    domainName,
    statusId,
    statusLabel: statusLabel ?? null,
    mappedStatus: statusMeta?.mapped ?? null,
    providerEventId,
    summary,
    rawKeys: Object.keys(merged).slice(0, 40),
  };

  pushEvent(event);

  const handled = kind === "domain.transfer" || kind === "domain.status";
  const note = handled
    ? kind === "domain.transfer"
      ? "Domain transfer notification acknowledged (use async handler to persist inventory status)."
      : "Domain status notification acknowledged (use async handler to persist inventory status)."
    : "Notification acknowledged; payload shape not fully mapped — stored as stub.";

  return { received: true, event, handled, note };
}

/** Acknowledge + update InfrastructureDomain status when the name matches inventory. */
export async function handleDreamscapeWebhookPayloadAsync(
  body: unknown,
  rawBody = "",
): Promise<HandleDreamscapeWebhookResult & { inventoryUpdated: boolean }> {
  const result = handleDreamscapeWebhookPayload(body, rawBody);
  let inventoryUpdated = false;
  if (
    result.event.domainName &&
    result.event.mappedStatus &&
    process.env.DATABASE_URL
  ) {
    try {
      const { updateDomainStatusByName } = await import("../../domains/inventory");
      const updated = await updateDomainStatusByName(
        result.event.domainName,
        result.event.mappedStatus,
        {
          metadata: {
            webhookEventId: result.event.id,
            webhookKind: result.event.kind,
            statusId: result.event.statusId,
            statusLabel: result.event.statusLabel,
          },
        },
      );
      inventoryUpdated = Boolean(updated);
    } catch {
      inventoryUpdated = false;
    }
  }
  return {
    ...result,
    inventoryUpdated,
    note: inventoryUpdated
      ? `Domain inventory updated to ${result.event.mappedStatus}.`
      : result.note,
  };
}

/** Production Notification URL (append ?secret= when using query auth). */
export function dreamscapeNotificationUrl(baseAppUrl?: string): string {
  const base = (baseAppUrl || "https://app.digitalgate.com.au").replace(
    /\/$/,
    "",
  );
  return `${base}${DREAMSCAPE_WEBHOOK_PATH}`;
}
