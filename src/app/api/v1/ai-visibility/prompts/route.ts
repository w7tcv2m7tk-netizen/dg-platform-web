import {
  AI_VISIBILITY_PROMPT_CLASSES,
  createAiVisibilityPrompt,
  listAiVisibilityPrompts,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "view",
    scope: "organisation",
  });
  if (denied) return denied;

  const items = await listAiVisibilityPrompts(session.organisationId);
  return NextResponse.json({ data: { items, promptClasses: AI_VISIBILITY_PROMPT_CLASSES } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "create",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const promptText = typeof body.promptText === "string" ? body.promptText.trim() : "";
  const promptClass = typeof body.promptClass === "string" ? body.promptClass.trim() : "";
  if (!promptText || !promptClass) {
    return NextResponse.json(
      { error: { code: "validation", message: "promptText and promptClass are required" } },
      { status: 422 },
    );
  }

  try {
    const item = await createAiVisibilityPrompt({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      promptText,
      promptClass,
      topic: typeof body.topic === "string" ? body.topic : null,
      locale: typeof body.locale === "string" ? body.locale : undefined,
      market: typeof body.market === "string" ? body.market : undefined,
      source: "manual",
      rationale: typeof body.rationale === "string" ? body.rationale : null,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: error instanceof Error ? error.message : "Could not create prompt",
        },
      },
      { status: 422 },
    );
  }
}
