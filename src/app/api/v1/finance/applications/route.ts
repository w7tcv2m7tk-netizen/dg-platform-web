import { createFinanceApplication, listFinanceApplications } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const result = await listFinanceApplications({
    organisationId: session.organisationId,
    status: searchParams.get("status") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "title is required" } },
      { status: 422 },
    );
  }

  const loanRaw = body.loanAmountCents;
  const loanAmountCents =
    typeof loanRaw === "number"
      ? loanRaw
      : typeof loanRaw === "string" && loanRaw.trim()
        ? Number.parseInt(loanRaw, 10)
        : undefined;

  const app = await createFinanceApplication({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    title: body.title,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    contactId: typeof body.contactId === "string" ? body.contactId : undefined,
    loanAmountCents:
      loanAmountCents !== undefined && !Number.isNaN(loanAmountCents)
        ? loanAmountCents
        : undefined,
    lenderName: typeof body.lenderName === "string" ? body.lenderName : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  return NextResponse.json({ data: app }, { status: 201 });
}
