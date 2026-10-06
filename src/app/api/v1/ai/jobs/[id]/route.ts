import { assertEntitlement, cancelAiLocalJob, getAiLocalJob, readAiLocalJobForActor } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

type Context = { params: Promise<{ id: string }> };

async function authorisedJob(req: Request, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const entitlement = await assertEntitlement(session.organisationId, "useAi");
  if (!entitlement.ok) return NextResponse.json({ error: { code: entitlement.code } }, { status: 403 });
  const job = await getAiLocalJob({ id, organisationId: session.organisationId });
  if (!job) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  for (const required of ["crm.leads.read", "crm.contacts.read"]) {
    const denied = requireFeature(session, required);
    if (denied) return denied;
  }
  return { session, job };
}

export async function GET(req: Request, context: Context) {
  const { id } = await context.params;
  const access = await authorisedJob(req, id);
  if (access instanceof NextResponse) return access;
  const data = await readAiLocalJobForActor({ id, organisationId: access.session.organisationId });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function DELETE(req: Request, context: Context) {
  const { id } = await context.params;
  const access = await authorisedJob(req, id);
  if (access instanceof NextResponse) return access;
  const job = await cancelAiLocalJob({ id, organisationId: access.session.organisationId });
  return NextResponse.json({ data: job ? { id: job.id, status: job.status, cancelRequested: Boolean(job.cancelRequestedAt) } : null });
}
