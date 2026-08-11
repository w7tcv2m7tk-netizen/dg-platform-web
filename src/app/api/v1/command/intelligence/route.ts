import { askPlatformIntelligence } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requireCommandCentre } from "@/lib/command-api";
import { loadPlatformDocCorpus } from "@/lib/load-platform-doc";
import { isNextResponse } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requireCommandCentre(req, "command.platform.read");
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "question required" } },
      { status: 422 },
    );
  }

  if (question.length > 2000) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "question too long (max 2000 characters)",
        },
      },
      { status: 422 },
    );
  }

  const docs = await loadPlatformDocCorpus();
  const result = await askPlatformIntelligence({ question, docs });

  return NextResponse.json({ data: result });
}
