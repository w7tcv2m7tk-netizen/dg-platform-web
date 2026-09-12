import { NextResponse } from "next/server";
import {
  dropboxSignConfigured,
  getSigningDocumentRecord,
  saveSigningSnapshot,
  sendDropboxSignRequest,
  signingSnapshotFromMetadata,
} from "@dg/platform-core";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

type RouteContext = { params: Promise<{ id: string }> };

type SignerInput = {
  email?: string;
  name?: string;
  order?: number;
};

export async function GET(req: Request, context: RouteContext) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "documents.read");
  if (denied) return denied;

  const { id } = await context.params;
  const document = await getSigningDocumentRecord(session.organisationId, id);
  if (!document) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      configured: dropboxSignConfigured(),
      provider: "dropbox_sign",
      status: document.signingStatus,
      request: signingSnapshotFromMetadata(document.metadata),
    },
  });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "documents.write");
  if (denied) return denied;

  if (!dropboxSignConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "signing_not_configured",
          message: "Digital signing is not configured yet. Add the Dropbox Sign API credentials first.",
        },
      },
      { status: 503 },
    );
  }

  let body: {
    signers?: SignerInput[];
    subject?: string;
    message?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const signers = (body.signers ?? [])
    .map((signer, index) => ({
      email: signer.email?.trim() ?? "",
      name: signer.name?.trim() ?? "",
      order: Number.isInteger(signer.order) ? signer.order : index,
    }))
    .filter((signer) => signer.email || signer.name);

  if (signers.length === 0 || signers.length > 10) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_signers",
          message: "Add between 1 and 10 signers.",
        },
      },
      { status: 422 },
    );
  }
  const invalidSigner = signers.find(
    (signer) => !signer.name || !/^\S+@\S+\.\S+$/.test(signer.email),
  );
  if (invalidSigner) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_signer",
          message: "Each signer needs a name and valid email address.",
        },
      },
      { status: 422 },
    );
  }

  const { id } = await context.params;
  const document = await getSigningDocumentRecord(session.organisationId, id);
  if (!document) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found" } },
      { status: 404 },
    );
  }
  if (!document.url) {
    return NextResponse.json(
      { error: { code: "file_unavailable", message: "Document file is unavailable" } },
      { status: 422 },
    );
  }
  if (["sent", "viewed"].includes(document.signingStatus)) {
    return NextResponse.json(
      {
        error: {
          code: "signing_in_progress",
          message: "This document already has a signature request in progress.",
        },
      },
      { status: 409 },
    );
  }
  if (document.signingStatus === "completed" && document.signingProvider === "dropbox_sign") {
    return NextResponse.json(
      {
        error: {
          code: "already_completed",
          message: "This document has already completed digital signing.",
        },
      },
      { status: 409 },
    );
  }

  try {
    const snapshot = await sendDropboxSignRequest({
      organisationId: session.organisationId,
      documentId: document.id,
      documentName: document.name,
      fileUrl: document.url,
      signers,
      subject: body.subject,
      message: body.message,
    });

    await saveSigningSnapshot({
      organisationId: session.organisationId,
      documentId: document.id,
      snapshot,
      actorId: session.clerkUserId,
      eventId: "document.signing_requested",
      eventTitle: "Document sent for signature",
    });

    return NextResponse.json({
      data: {
        provider: "dropbox_sign",
        request: snapshot,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send signature request";
    return NextResponse.json(
      { error: { code: "signing_send_failed", message } },
      { status: 502 },
    );
  }
}
