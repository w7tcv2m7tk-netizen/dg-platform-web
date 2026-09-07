import { NextResponse } from "next/server";
import { updateCommissionStatus, type CommissionStatus } from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUSES: CommissionStatus[] = ["CALCULATED", "PENDING", "APPROVED", "PAID"];

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;

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
