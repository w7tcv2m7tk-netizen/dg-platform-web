import {
  createFinanceApplication,
  listFinanceApplications,
  updateFinanceApplication,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireIndustryAppBeta, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "finance");
    if (betaDenied) return betaDenied;
  }

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
  {
    const betaDenied = await requireIndustryAppBeta(session, "finance");
    if (betaDenied) return betaDenied;
  }

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
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : undefined,
  });

  return NextResponse.json({ data: app }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  {
    const betaDenied = await requireIndustryAppBeta(session, "finance");
    if (betaDenied) return betaDenied;
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id is required" } },
      { status: 422 },
    );
  }

  const loanRaw = body.loanAmountCents;
  const loanAmountCents =
    typeof loanRaw === "number"
      ? loanRaw
      : typeof loanRaw === "string" && loanRaw.trim()
        ? Number.parseInt(loanRaw, 10)
        : body.loanAmountCents === null
          ? null
          : undefined;

  const updated = await updateFinanceApplication({
    organisationId: session.organisationId,
    applicationId: body.id,
    actorId: session.clerkUserId,
    title: typeof body.title === "string" ? body.title : undefined,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    status:
      body.status === "open" ||
      body.status === "closed" ||
      body.status === "won" ||
      body.status === "lost"
        ? body.status
        : undefined,
    contactId:
      typeof body.contactId === "string"
        ? body.contactId
        : body.contactId === null
          ? null
          : undefined,
    loanAmountCents:
      loanAmountCents !== undefined &&
      (loanAmountCents === null || !Number.isNaN(loanAmountCents))
        ? loanAmountCents
        : undefined,
    lenderName:
      typeof body.lenderName === "string"
        ? body.lenderName
        : body.lenderName === null
          ? null
          : undefined,
    notes:
      typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : body.metadata === null
          ? null
          : undefined,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Application not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
