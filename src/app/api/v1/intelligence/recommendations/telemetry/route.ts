import {
  AI_RECOMMENDATION_STAGES,
  getAiRecommendationTelemetrySummary,
  recordAiRecommendationTelemetry,
  type AiRecommendationStage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

function validStage(value: unknown): value is AiRecommendationStage {
  return typeof value === "string" && AI_RECOMMENDATION_STAGES.includes(value as AiRecommendationStage);
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const url = new URL(req.url);
  const daysRaw = Number(url.searchParams.get("days") ?? 30);
  const days = Number.isFinite(daysRaw) ? daysRaw : 30;

  const summary = await getAiRecommendationTelemetrySummary({
    organisationId: session.organisationId,
    days,
  });
  return NextResponse.json({ data: { summary } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Expected JSON telemetry payload" } },
      { status: 400 },
    );
  }

  const events = Array.isArray((body as { events?: unknown })?.events)
    ? (body as { events: unknown[] }).events
    : [body];
  if (events.length === 0 || events.length > 20) {
    return NextResponse.json(
      { error: { code: "invalid_batch", message: "Send between 1 and 20 telemetry events" } },
      { status: 400 },
    );
  }

  let recorded = 0;
  for (const raw of events) {
    if (!raw || typeof raw !== "object") continue;
    const event = raw as Record<string, unknown>;
    const recommendationId = String(event.recommendationId ?? "").trim();
    if (!recommendationId || recommendationId.length > 160 || !validStage(event.stage)) {
      continue;
    }
    await recordAiRecommendationTelemetry({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      recommendationId,
      stage: event.stage,
      label: typeof event.label === "string" ? event.label.slice(0, 240) : null,
      impact: typeof event.impact === "string" ? event.impact.slice(0, 500) : null,
      href: typeof event.href === "string" ? event.href.slice(0, 1000) : null,
      source: "business_overview",
    });
    recorded += 1;
  }

  if (recorded === 0) {
    return NextResponse.json(
      { error: { code: "invalid_events", message: "No valid telemetry events supplied" } },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: { recorded } });
}
