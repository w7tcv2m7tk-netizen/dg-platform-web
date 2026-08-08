import {
  DREAMSCAPE_WEBHOOK_PATH,
  dreamscapeNotificationUrl,
  handleDreamscapeWebhookPayloadAsync,
  isDreamscapeWebhookConfigured,
  verifyDreamscapeWebhookRequest,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

/** Node runtime — webhook secret + handlers stay server-side. */
export const runtime = "nodejs";

/**
 * POST /api/webhooks/dreamscape
 *
 * Dreamscape Reseller Console → Notification URL for domain transfers.
 * Server-side only. Does not use or expose DREAMSCAPE_API_KEY.
 *
 * Auth: DREAMSCAPE_WEBHOOK_SECRET via ?secret= (recommended for console paste)
 * or X-Dreamscape-Webhook-Secret / Bearer token.
 */
export async function POST(req: Request) {
  const verified = verifyDreamscapeWebhookRequest(req);
  if (!verified.ok) {
    const status =
      verified.reason === "DREAMSCAPE_WEBHOOK_SECRET is not configured"
        ? 503
        : 401;
    return NextResponse.json(
      { error: { code: "unauthorized", message: verified.reason } },
      { status },
    );
  }

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  const rawBody = await req.text();

  let body: unknown = null;
  if (rawBody.trim()) {
    if (
      contentType.includes("application/json") ||
      rawBody.trim().startsWith("{") ||
      rawBody.trim().startsWith("[")
    ) {
      try {
        body = JSON.parse(rawBody) as unknown;
      } catch {
        return NextResponse.json(
          { error: { code: "invalid_json", message: "Invalid JSON body" } },
          { status: 400 },
        );
      }
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const params = new URLSearchParams(rawBody);
      body = Object.fromEntries(params.entries());
    } else {
      try {
        body = JSON.parse(rawBody) as unknown;
      } catch {
        body = { raw: rawBody.slice(0, 4000) };
      }
    }
  } else {
    // Some notifiers probe with empty POST — still acknowledge when authenticated
    body = {};
  }

  const result = await handleDreamscapeWebhookPayloadAsync(body, rawBody);

  console.info("[dreamscape webhook]", {
    kind: result.event.kind,
    domain: result.event.domainName,
    statusId: result.event.statusId,
    mappedStatus: result.event.mappedStatus,
    handled: result.handled,
    inventoryUpdated: result.inventoryUpdated,
    persisted: result.persisted,
    eventId: result.event.id,
  });

  return NextResponse.json(
    {
      received: true,
      handled: result.handled,
      inventoryUpdated: result.inventoryUpdated,
      persisted: result.persisted,
      eventId: result.event.id,
      kind: result.event.kind,
      domain: result.event.domainName,
      mappedStatus: result.event.mappedStatus,
      note: result.note,
    },
    { status: 200 },
  );
}

/** Ops probe — does not reveal the secret. */
export async function GET() {
  const configured = isDreamscapeWebhookConfigured();
  return NextResponse.json({
    status: "ok",
    endpoint: DREAMSCAPE_WEBHOOK_PATH,
    configured,
    notificationUrl: dreamscapeNotificationUrl(
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        "https://app.digitalgate.com.au",
    ),
    auth: configured
      ? "Set Notification URL to the endpoint with ?secret=<DREAMSCAPE_WEBHOOK_SECRET>, or send X-Dreamscape-Webhook-Secret"
      : "Set DREAMSCAPE_WEBHOOK_SECRET (separate from DREAMSCAPE_API_KEY)",
  });
}
