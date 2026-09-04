import {
  getOperatorCommandFeatureFlagsOverview,
  updateOperatorOrganisationFeatureFlags,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req, "command.platform.read");
  if (isNextResponse(auth)) return auth;

  const data = await getOperatorCommandFeatureFlagsOverview(auth.operator);
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const auth = await requirePlatformOperator(req, "command.flags.manage");
  if (isNextResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const organisationId =
    typeof body.organisationId === "string" ? body.organisationId.trim() : "";
  const raw = body.flags;

  if (!organisationId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "organisationId required" } },
      { status: 422 },
    );
  }

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

  const next = await updateOperatorOrganisationFeatureFlags(auth.operator, {
    organisationId,
    flags,
  });

  return NextResponse.json({ data: { organisationId, flags: next } });
}
