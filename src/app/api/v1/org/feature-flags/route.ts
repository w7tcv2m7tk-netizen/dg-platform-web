import {
  getOrganisationFeatureFlags,
  KNOWN_FEATURE_FLAGS,
  updateOrganisationFeatureFlags,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const flags = await getOrganisationFeatureFlags(session.organisationId);
  return NextResponse.json({
    data: {
      flags,
      known: KNOWN_FEATURE_FLAGS,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  if (session.role !== "owner" && session.role !== "admin") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Only owners and admins can manage feature flags",
        },
      },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const raw = body.flags;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "flags object required" } },
      { status: 422 },
    );
  }

  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === "string" && key.length > 0 && typeof value === "boolean") {
      flags[key] = value;
    }
  }

  if (!Object.keys(flags).length) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "No valid flag updates" } },
      { status: 422 },
    );
  }

  const next = await updateOrganisationFeatureFlags({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    flags,
  });

  return NextResponse.json({ data: { flags: next } });
}
