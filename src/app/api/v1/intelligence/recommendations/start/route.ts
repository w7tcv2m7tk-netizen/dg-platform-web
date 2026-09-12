import { recordAiRecommendationTelemetry } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

function safeInternalRedirect(value: string | null) {
  const target = value?.trim() || "/dashboard";
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) {
    return "/dashboard";
  }
  return target;
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const recommendationId = url.searchParams.get("recommendationId")?.trim() ?? "";
  const redirect = safeInternalRedirect(url.searchParams.get("redirect"));
  if (!recommendationId || recommendationId.length > 160) {
    return NextResponse.redirect(new URL(redirect, url.origin), 303);
  }

  try {
    await recordAiRecommendationTelemetry({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      recommendationId,
      stage: "started",
      label: url.searchParams.get("label")?.slice(0, 240) ?? null,
      impact: url.searchParams.get("impact")?.slice(0, 500) ?? null,
      href: redirect,
      source: "business_overview",
    });
  } catch (err) {
    // Telemetry must never block the customer's action.
    console.error("[intelligence] recommendation start telemetry failed", err);
  }

  return NextResponse.redirect(new URL(redirect, url.origin), 303);
}
