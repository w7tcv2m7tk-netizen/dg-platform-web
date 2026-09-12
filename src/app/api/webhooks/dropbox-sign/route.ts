import { NextResponse } from "next/server";
import {
  downloadDropboxSignPdf,
  recipientsFromDropboxSignatures,
  signingSnapshotFromMetadata,
  getSigningDocumentRecord,
  storeCompletedSignedPdf,
  updateSigningFromProviderEvent,
  verifyDropboxSignEvent,
  type DocumentSigningStatus,
  type DropboxSignEventPayload,
} from "@dg/platform-core";

const ACK = "Hello API Event Received";

function ack(status = 200) {
  return new NextResponse(ACK, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function statusForEvent(eventType: string): DocumentSigningStatus | null {
  switch (eventType) {
    case "signature_request_sent":
      return "sent";
    case "signature_request_viewed":
    case "signature_request_signed":
    case "signature_request_all_signed":
      // Final artefact is not guaranteed ready at all_signed. DigitalGate only
      // marks completed after signature_request_downloadable is persisted.
      return "viewed";
    case "signature_request_declined":
      return "declined";
    case "signature_request_expired":
    case "signature_request_canceled":
      return "expired";
    default:
      return null;
  }
}

export async function POST(req: Request) {
  let payload: DropboxSignEventPayload;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const raw = form.get("json");
      if (typeof raw !== "string") return ack(400);
      payload = JSON.parse(raw) as DropboxSignEventPayload;
    } else {
      payload = (await req.json()) as DropboxSignEventPayload;
    }
  } catch {
    return ack(400);
  }

  try {
    if (!verifyDropboxSignEvent(payload)) return ack(401);
  } catch {
    return ack(503);
  }

  const eventType = payload.event?.event_type ?? "";
  const request = payload.signature_request;
  const externalId = request?.signature_request_id?.trim() ?? "";
  const organisationId = metadataString(
    request?.metadata,
    "digitalgate_organisation_id",
  );
  const documentId = metadataString(request?.metadata, "digitalgate_document_id");

  // Valid callbacks for other requests may share the account-level callback.
  // Acknowledge them without touching DigitalGate records.
  if (!externalId || !organisationId || !documentId) return ack();

  const document = await getSigningDocumentRecord(organisationId, documentId).catch(() => null);
  if (!document) return ack();
  const current = signingSnapshotFromMetadata(document.metadata);
  if (!current || current.externalId !== externalId) return ack();

  const recipients = recipientsFromDropboxSignatures(
    request?.signatures,
    current.recipients,
  );

  try {
    if (eventType === "signature_request_downloadable") {
      if (!current.downloadedAt) {
        const pdf = await downloadDropboxSignPdf(externalId);
        await storeCompletedSignedPdf({
          organisationId,
          documentId,
          externalId,
          pdf,
          recipients,
          providerEvent: eventType,
        });
      }
      return ack();
    }

    const status = statusForEvent(eventType);
    if (status) {
      await updateSigningFromProviderEvent({
        organisationId,
        documentId,
        externalId,
        status,
        recipients,
        providerEvent: eventType,
        detailsUrl: request?.details_url,
        signingUrl: request?.signing_url,
      });
    }
  } catch (err) {
    console.error("[dropbox-sign] callback processing failed", {
      eventType,
      externalId,
      documentId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Ask Dropbox Sign to retry transient storage/provider failures.
    return ack(500);
  }

  return ack();
}
