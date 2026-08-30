import { NextResponse } from "next/server";
import { suspendPartner, canAccessCommandCentre } from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformSession(req);
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
  const partner = await suspendPartner(id);
  return NextResponse.json({ data: partner });
}
