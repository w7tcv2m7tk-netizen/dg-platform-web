import {
  getCompany,
  listCompanyContacts,
  updateCompany,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.companies.read");
  if (denied) return denied;

  const { id } = await params;
  const company = await getCompany(session.organisationId, id);
  if (!company) {
    return NextResponse.json(
      { error: { code: "company_not_found", message: "Company not found" } },
      { status: 404 },
    );
  }

  const contacts = await listCompanyContacts(session.organisationId, id);

  return NextResponse.json({ data: { company, contacts } });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.companies.write");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid body" } },
      { status: 422 },
    );
  }

  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name cannot be empty" } },
      { status: 422 },
    );
  }

  const updated = await updateCompany({
    organisationId: session.organisationId,
    companyId: id,
    actorId: session.clerkUserId,
    name: body.name,
    website: body.website,
    phone: body.phone,
    email: body.email,
    industry: body.industry,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "company_not_found", message: "Company not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
