import { NextResponse } from "next/server";
import {
  createCommunicationSignature,
  deleteCommunicationSignature,
  listCommunicationSignatures,
  updateCommunicationSignature,
  type CommunicationSignatureDraft,
  type CommunicationSignaturePatch,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;
  const signatures = await listCommunicationSignatures(session.organisationId);
  return NextResponse.json({ data: { signatures } });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as CommunicationSignatureDraft | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const result = await createCommunicationSignature(session.organisationId, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "validation_error", message: result.error } },
      { status: 422 },
    );
  }
  return NextResponse.json({ data: result });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as
    | (CommunicationSignaturePatch & { id?: string })
    | null;
  const id = body?.id?.trim();
  if (!body || !id) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id is required" } },
      { status: 422 },
    );
  }

  const { id: _id, ...patch } = body;
  const result = await updateCommunicationSignature(session.organisationId, id, patch);
  if ("error" in result) {
    const status = result.error === "Signature not found" ? 404 : 422;
    return NextResponse.json(
      {
        error: {
          code: status === 404 ? "not_found" : "validation_error",
          message: result.error,
        },
      },
      { status },
    );
  }
  return NextResponse.json({ data: result });
}

export async function DELETE(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim() || "";
  if (!id) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id is required" } },
      { status: 422 },
    );
  }

  const result = await deleteCommunicationSignature(session.organisationId, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "not_found", message: result.error } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: result });
}
