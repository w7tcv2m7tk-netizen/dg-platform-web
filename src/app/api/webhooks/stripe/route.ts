import { bootPaymentConnectors, processPaymentWebhookEvent, requirePaymentConnector } from "@dg/platform-core";
import { NextResponse } from "next/server";

bootPaymentConnectors();

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const connector = requirePaymentConnector("stripe");
    const event = await connector.parseWebhook(rawBody, headers);
    const result = await processPaymentWebhookEvent(event);

    if (!result.ok) {
      return NextResponse.json({ received: true, skipped: result.reason }, { status: 200 });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const configured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/stripe",
    configured,
  });
}
