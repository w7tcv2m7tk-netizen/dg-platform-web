import { NextResponse } from "next/server";
import { markFoundingAgreementSigned } from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as { inviteToken?: string } | null;
  const inviteToken = body?.inviteToken?.trim();
  const record = await markFoundingAgreementSigned({
    customerOrganisationId: session.organisationId,
    actorId: session.clerkUserId,
    inviteToken,
  });
  return NextResponse.json({ data: record });
}
