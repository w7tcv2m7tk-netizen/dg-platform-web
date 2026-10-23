import { AcquisitionError, legacyAustralianAbns, verifyAcquisitionAbn } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;
  const { id } = await params;
  const { prisma } = await import("@dg/database");
  const prospect = await prisma.growthProspect.findFirst({ where: { id, organisationId: session.organisationId, archivedAt: null } });
  if (!prospect) return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (typeof body?.abn !== "string") return NextResponse.json({ error: { code: "validation", message: "ABN is required" } }, { status: 422 });
  try {
    const identity = await verifyAcquisitionAbn(body.abn);
    if (prospect.abn && prospect.abn !== identity.abn) throw new AcquisitionError("identity_conflict", "Verified identity cannot be replaced by intake");
    const data = await prisma.$transaction(async (tx) => {
      const legacy = await tx.growthProspect.findMany({ where: { organisationId: session.organisationId, id: { not: id }, abn: null }, select: { metadata: true } });
      if (legacy.some((row) => legacyAustralianAbns(row.metadata).includes(identity.abn)))
        throw new AcquisitionError("reconciliation_required", "Another legacy record claims this ABN; reconcile the records explicitly");
      const meta = prospect.metadata as { crm_company_id?: string } | null;
      if (meta?.crm_company_id) {
        const company = await tx.company.findFirst({ where: { id: meta.crm_company_id, organisationId: session.organisationId, deletedAt: null } });
        if (!company || (company.abn && company.abn !== identity.abn)) throw new AcquisitionError("identity_conflict", "Linked CRM company has a conflicting identity");
        await tx.company.updateMany({ where: { id: company.id, organisationId: session.organisationId, abn: null }, data: { abn: identity.abn, identityProvenance: JSON.parse(JSON.stringify(identity.provenance)) } });
      }
      const updated = await tx.growthProspect.updateMany({ where: { id, organisationId: session.organisationId, archivedAt: null, OR: [{ abn: null }, { abn: identity.abn }] }, data: { abn: identity.abn, identityProvenance: JSON.parse(JSON.stringify(identity.provenance)) } });
      if (!updated.count) throw new AcquisitionError("identity_conflict", "Business identity changed; refresh before continuing");
      await tx.growthProspectEngagement.create({ data: { prospectId: id, type: "business_identity_verified", metadata: { abn: identity.abn, actorId: session.clerkUserId } } });
      return { prospectId: id, abn: identity.abn, provenance: identity.provenance };
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof AcquisitionError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: { code: "duplicate_abn", message: "This ABN already has a prospect in your organisation; no records were merged" } }, { status: 409 });
    throw error;
  }
}
