import {
  archiveOrgDocument,
  getOrgDocument,
  updateOrgDocument,
  type DocumentSigningStatus,
  type DocumentStatus,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const document = await getOrgDocument(session.organisationId, id);
  if (!document) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { document } });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  let body: {
    name?: string;
    documentStatus?: string;
    signingStatus?: string;
    archive?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Expected JSON body" } },
      { status: 400 },
    );
  }

  const document = await updateOrgDocument(session.organisationId, id, {
    name: body.name,
    documentStatus: body.documentStatus as DocumentStatus | undefined,
    signingStatus: body.signingStatus as DocumentSigningStatus | undefined,
    archive: body.archive === true,
  });

  if (!document) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { document } });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const document = await archiveOrgDocument(session.organisationId, id);
  if (!document) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { document } });
}
