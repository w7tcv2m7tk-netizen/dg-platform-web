import { AcquisitionError, linkAcquisitionRelationship } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  for (const feature of ["prospecting.prospects.write", "crm.companies.write", "crm.contacts.write"] as const) {
    const denied = requireFeature(session, feature);
    if (denied) return denied;
  }
  const body = await req.json().catch(() => null);
  const keys = ["companyId", "contactId", "customerOrganisationId"] as const;
  if (!body || !keys.some((k) => typeof body[k] === "string" && body[k].trim()) || keys.some((k) => body[k] !== undefined && (typeof body[k] !== "string" || !body[k].trim())))
    return NextResponse.json({ error: { code: "validation", message: "Supply explicit relationship identifiers" } }, { status: 422 });
  try {
    const { id } = await params;
    const data = await linkAcquisitionRelationship({ organisationId: session.organisationId, prospectId: id, actorId: session.clerkUserId, companyId: body.companyId, contactId: body.contactId, customerOrganisationId: body.customerOrganisationId });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof AcquisitionError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: { code: "identity_conflict", message: "ABN already belongs to another CRM company; select that company explicitly" } }, { status: 409 });
    throw error;
  }
}
