import { createHmac, timingSafeEqual } from "node:crypto";

import type { DocumentSigningStatus, SigningRecipient } from "./types";

const API_BASE = "https://api.hellosign.com/v3";

export type DropboxSignSigner = {
  email: string;
  name: string;
  order?: number;
};

export type DropboxSignRequestSnapshot = {
  id: string;
  externalId: string;
  provider: "dropbox_sign";
  status: DocumentSigningStatus;
  recipients: SigningRecipient[];
  sentAt: string;
  completedAt?: string;
  downloadedAt?: string;
  testMode: boolean;
  detailsUrl?: string;
  signingUrl?: string;
  providerEvent?: string;
};

type DropboxSignature = {
  signature_id?: string;
  signer_email_address?: string;
  signer_name?: string;
  status_code?: string;
  signed_at?: number | null;
  last_viewed_at?: number | null;
};

export type DropboxSignEventPayload = {
  event?: {
    event_type?: string;
    event_time?: string | number;
    event_hash?: string;
  };
  signature_request?: {
    signature_request_id?: string;
    details_url?: string;
    signing_url?: string;
    is_complete?: boolean;
    is_declined?: boolean;
    metadata?: Record<string, unknown>;
    signatures?: DropboxSignature[];
  };
};

function apiKey(): string {
  const value = process.env.DROPBOX_SIGN_API_KEY?.trim();
  if (!value) {
    throw new Error("Dropbox Sign is not configured. Add DROPBOX_SIGN_API_KEY before sending documents.");
  }
  return value;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${apiKey()}:`).toString("base64")}`;
}

export function dropboxSignConfigured(): boolean {
  return Boolean(process.env.DROPBOX_SIGN_API_KEY?.trim());
}

export function dropboxSignTestMode(): boolean {
  // Fail safe: requests remain non-binding until live mode is explicitly enabled.
  return process.env.DROPBOX_SIGN_TEST_MODE?.trim() !== "0";
}

function unixIso(value?: number | null): string | undefined {
  if (!value) return undefined;
  return new Date(value * 1000).toISOString();
}

function recipientStatus(signature: DropboxSignature): DocumentSigningStatus {
  const status = (signature.status_code ?? "").toLowerCase();
  if (status === "signed") return "completed";
  if (status === "declined") return "declined";
  if (status === "expired") return "expired";
  if (signature.last_viewed_at) return "viewed";
  return "sent";
}

export function recipientsFromDropboxSignatures(
  signatures: DropboxSignature[] | undefined,
  fallback: SigningRecipient[] = [],
): SigningRecipient[] {
  if (!signatures?.length) return fallback;
  return signatures.map((signature, index) => ({
    role: `signer_${index + 1}`,
    name: signature.signer_name?.trim() || undefined,
    email: signature.signer_email_address?.trim() || fallback[index]?.email || "",
    status: recipientStatus(signature),
    signedAt: unixIso(signature.signed_at),
  }));
}

export async function sendDropboxSignRequest(input: {
  organisationId: string;
  documentId: string;
  documentName: string;
  fileUrl: string;
  signers: DropboxSignSigner[];
  subject?: string;
  message?: string;
}): Promise<DropboxSignRequestSnapshot> {
  if (!input.fileUrl) throw new Error("Document does not have a downloadable file URL.");
  if (input.signers.length === 0) throw new Error("At least one signer is required.");

  const testMode = dropboxSignTestMode();
  const body: Record<string, unknown> = {
    file_urls: [input.fileUrl],
    title: input.documentName.slice(0, 255),
    subject: (input.subject?.trim() || `Please sign ${input.documentName}`).slice(0, 255),
    message:
      input.message?.trim() ||
      "Please review and sign this document. A completed copy will be retained in DigitalGate Documents.",
    signers: input.signers.map((signer, index) => ({
      email_address: signer.email.trim(),
      name: signer.name.trim(),
      order: signer.order ?? index,
    })),
    metadata: {
      digitalgate_document_id: input.documentId,
      digitalgate_organisation_id: input.organisationId,
    },
    test_mode: testMode,
  };

  const clientId = process.env.DROPBOX_SIGN_CLIENT_ID?.trim();
  if (clientId) body.client_id = clientId;

  const response = await fetch(`${API_BASE}/signature_request/send`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as {
    signature_request?: {
      signature_request_id?: string;
      details_url?: string;
      signing_url?: string;
      signatures?: DropboxSignature[];
    };
    error?: { error_msg?: string };
  };

  if (!response.ok || !json.signature_request?.signature_request_id) {
    throw new Error(
      json.error?.error_msg || `Dropbox Sign send failed with HTTP ${response.status}`,
    );
  }

  const request = json.signature_request;
  const externalId = request.signature_request_id;
  const sentAt = new Date().toISOString();
  const fallbackRecipients: SigningRecipient[] = input.signers.map((signer, index) => ({
    role: `signer_${index + 1}`,
    name: signer.name,
    email: signer.email,
    status: "sent",
  }));

  return {
    id: externalId,
    externalId,
    provider: "dropbox_sign",
    status: "sent",
    recipients: recipientsFromDropboxSignatures(request.signatures, fallbackRecipients),
    sentAt,
    testMode,
    detailsUrl: request.details_url,
    signingUrl: request.signing_url,
    providerEvent: "signature_request_sent",
  };
}

export function verifyDropboxSignEvent(payload: DropboxSignEventPayload): boolean {
  const type = payload.event?.event_type;
  const time = payload.event?.event_time;
  const suppliedHash = payload.event?.event_hash;
  if (!type || time == null || !suppliedHash) return false;

  const expected = createHmac("sha256", apiKey())
    .update(`${time}${type}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(suppliedHash, "utf8");
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function downloadDropboxSignPdf(externalId: string): Promise<Buffer> {
  const response = await fetch(
    `${API_BASE}/signature_request/files/${encodeURIComponent(externalId)}?file_type=pdf`,
    {
      method: "GET",
      headers: { Authorization: authHeader(), Accept: "application/pdf" },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Dropbox Sign signed-file download failed with HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
