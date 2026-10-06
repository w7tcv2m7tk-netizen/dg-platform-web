import { revokeAiLocalRecipient } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth, sessionIsOrgAdmin } from "@/lib/platform-api";

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!sessionIsOrgAdmin(session)) return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  const revoked = await revokeAiLocalRecipient({ organisationId: session.organisationId, approvalId: id });
  return revoked ? NextResponse.json({ data: revoked }) : NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
}
