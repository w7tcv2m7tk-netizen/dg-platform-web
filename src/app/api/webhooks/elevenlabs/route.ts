import { processElevenLabsWebhook } from "@dg/platform-core";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("elevenlabs-signature") || req.headers.get("ElevenLabs-Signature");

  const result = await processElevenLabsWebhook({
    rawBody,
    signatureHeader,
  });

  if (!result.ok && result.error === "invalid_signature") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "webhook failed" }, { status: 400 });
  }

  return NextResponse.json({ received: true, ...result });
}
