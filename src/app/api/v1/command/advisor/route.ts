import { generateOperatorClientAdvisorInsight } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

export async function POST(req: Request) {
  const auth = await requirePlatformOperator(req, "command.clients.read");
  if (isNextResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const organisationId =
    typeof body.organisationId === "string" ? body.organisationId.trim() : "";
  const question =
    typeof body.question === "string" ? body.question.trim() : undefined;

  if (!organisationId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "organisationId required" } },
      { status: 422 },
    );
  }

  const insight = await generateOperatorClientAdvisorInsight(auth.operator, {
    organisationId,
    question,
  });

  if (!insight) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Organisation not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      ...insight,
      generatedAt: insight.generatedAt.toISOString(),
    },
  });
}
