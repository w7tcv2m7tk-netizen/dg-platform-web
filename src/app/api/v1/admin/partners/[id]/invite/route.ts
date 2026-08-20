import { NextResponse } from "next/server";
import { canAccessCommandCentre, sendFoundingResellerInvitation } from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
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
  const result = await sendFoundingResellerInvitation({
    organisationId: session.organisationId,
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
