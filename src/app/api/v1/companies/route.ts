import {
  createCompany,
  listCompanies,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.companies.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const result = await listCompanies({
    organisationId: session.organisationId,
    search: searchParams.get("search") ?? undefined,
    limit: searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined,
    offset: searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset")!, 10)
      : undefined,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.companies.write");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }

  const company = await createCompany({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    name: body.name,
    website: body.website,
    phone: body.phone,
    email: body.email,
    industry: body.industry,
  });

  return NextResponse.json({ data: company }, { status: 201 });
}
