import { NextResponse } from "next/server";
import { sendFoundingResellerInvitation } from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;

  const { id } = await ctx.params;
  const result = await sendFoundingResellerInvitation({
    organisationId: auth.operator.operatorOrganisationId,
    partnerId: id,
  });
  if (result.error && !result.emailSent) {
    return NextResponse.json(
      { error: { code: "send_failed", message: result.error } },
      { status: 422 },
    );
  }
  return NextResponse.json({ data: result });
}
