import { NextResponse } from "next/server";
import { updateCommissionStatus, canAccessCommandCentre, type CommissionStatus } from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUSES: CommissionStatus[] = ["CALCULATED", "PENDING", "APPROVED", "PAID"];

export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
  if (!allowed) {
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status as CommissionStatus | undefined;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid status." } },
      { status: 400 },
    );
  }

  const commission = await updateCommissionStatus(id, status);
  return NextResponse.json({ data: commission });
}
