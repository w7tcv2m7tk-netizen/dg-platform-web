/**
 * REA Listing Upload API — upload/report helpers + re-exports of REAXML builder.
 *
 * @see ./reaxml.ts
 */

import {
  ensureValidOrgReaAccessToken,
  reaApiGet,
  reaApiPost,
  REA_LISTING_UPLOAD_PATH,
  type ReaApiFailure,
  type ReaApiSuccess,
} from "./auth";

export {
  buildReaListingXml,
  buildReaResidentialListingXml,
  formatReaModTime,
  normaliseReaState,
  splitReaStreetAddress,
  stripHtmlForReaxml,
  type ReaListingContact,
  type ReaListingXmlStatus,
  type ReaPropertyLike,
  type ReaXmlBuildFailure,
  type ReaXmlBuildResult,
  type ReaXmlBuildSuccess,
} from "./reaxml";

export type ReaUploadResponse = {
  uploadId: string;
};

export type ReaUploadReport = {
  uploadId?: string;
  completedTime?: string;
  progress?: string;
  result?: string;
  externalListingId?: string;
  listingId?: string | number;
  issues?: unknown;
};

export async function uploadReaListingXml(input: {
  organisationId: string;
  xml: string;
}): Promise<
  | { ok: true; uploadId: string; path: string; status: number; raw: unknown }
  | {
      ok: false;
      message: string;
      path?: string;
      status?: number;
      raw?: unknown;
    }
> {
  const ensured = await ensureValidOrgReaAccessToken(input.organisationId);
  if (!ensured.ok) {
    return { ok: false, message: ensured.message };
  }

  const res = await reaApiPost(
    REA_LISTING_UPLOAD_PATH,
    ensured.accessToken,
    input.xml,
    "text/xml",
  );
  if (!res.ok) {
    return {
      ok: false,
      message: res.message,
      path: res.path,
      status: res.status,
      raw: res.raw,
    };
  }

  const data = res.data as ReaUploadResponse | null;
  const uploadId =
    data && typeof data === "object" && typeof data.uploadId === "string"
      ? data.uploadId
      : null;
  if (!uploadId) {
    return {
      ok: false,
      message: "REA upload accepted but response missing uploadId",
      path: res.path,
      status: res.status,
      raw: res.data,
    };
  }

  return {
    ok: true,
    uploadId,
    path: res.path,
    status: res.status,
    raw: res.data,
  };
}

export async function fetchReaUploadReport(input: {
  organisationId: string;
  uploadId: string;
}): Promise<
  | { ok: true; report: ReaUploadReport; path: string; raw: unknown }
  | { ok: false; message: string; path?: string; raw?: unknown }
> {
  const ensured = await ensureValidOrgReaAccessToken(input.organisationId);
  if (!ensured.ok) {
    return { ok: false, message: ensured.message };
  }
  const path = `${REA_LISTING_UPLOAD_PATH}/${encodeURIComponent(input.uploadId)}`;
  const res: ReaApiSuccess | ReaApiFailure = await reaApiGet(path, ensured.accessToken);
  if (!res.ok) {
    return {
      ok: false,
      message: res.message,
      path: res.path,
      raw: res.raw,
    };
  }
  return {
    ok: true,
    report: (res.data ?? {}) as ReaUploadReport,
    path: res.path,
    raw: res.data,
  };
}
