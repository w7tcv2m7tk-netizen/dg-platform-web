/**
 * Publish a DigitalGate Property to realestate.com.au (REA Group).
 * Scaffold: fail closed — never returns ok:true / status "published".
 *
 * Property acts as Listing SoT until a first-class Listing model ships
 * (same pattern as Domain publish-property).
 */

import {
  getOrgReaConnectorTokens,
  reaCredentialsConfigured,
  reaOAuthEndpointsConfigured,
} from "./auth";

export type PublishPropertyToReaInput = {
  organisationId: string;
  propertyId: string;
  actorId?: string;
  /** Optional override when REA documents agency/office id */
  reaAgencyId?: string;
};

export type ReaPlacementRef = {
  channel: "rea";
  /** Never "published" from this scaffold — only draft/pending/error */
  status: "draft" | "pending" | "error";
  providerAdId: string;
  reaAgencyId?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  path?: string | null;
};

export type PublishPropertyToReaResult =
  | {
      ok: true;
      status: "pending";
      placement: ReaPlacementRef;
      message: string;
      raw?: unknown;
    }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "not_connected"
        | "not_found"
        | "validation"
        | "upstream_error"
        | "not_implemented";
      message: string;
      placement?: ReaPlacementRef;
      raw?: unknown;
    };

/**
 * Attempt REA publish. Until partner API upsert is wired, always returns
 * a failure reason — never ok:true / never status "published".
 */
export async function publishPropertyToRea(
  input: PublishPropertyToReaInput,
): Promise<PublishPropertyToReaResult> {
  if (!reaCredentialsConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "REA OAuth not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET on Vercel after partner access is granted",
    };
  }

  if (!reaOAuthEndpointsConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "REA OAuth endpoints unknown — set REA_AUTH_AUTHORIZE_URL + REA_AUTH_TOKEN_URL (+ REA_API_BASE_URL) from partner docs before publish",
    };
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, reason: "not_found", message: "Database not configured" };
  }

  const { prisma } = await import("@dg/database");
  const property = await prisma.property.findFirst({
    where: {
      id: input.propertyId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!property) {
    return { ok: false, reason: "not_found", message: "Property not found" };
  }

  if (!property.suburb?.trim() || !property.state?.trim() || !property.postcode?.trim()) {
    return {
      ok: false,
      reason: "validation",
      message: "Property needs suburb, state and postcode before REA publish",
    };
  }

  const tokens = await getOrgReaConnectorTokens(input.organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return {
      ok: false,
      reason: "not_connected",
      message:
        "REA account not connected for this organisation. Connect under Settings → Connectors when OAuth is live.",
    };
  }

  const providerAdId = `dg-${property.id}`.slice(0, 50);
  const prevRefs = (property.externalRefs as Record<string, unknown> | null) ?? {};
  const prevRea =
    prevRefs.rea && typeof prevRefs.rea === "object"
      ? (prevRefs.rea as Record<string, unknown>)
      : {};

  // Honest hold: credentials may exist, but Listing Hub / REAXML upsert is not built.
  // Do not mutate externalRefs to "published" or "pending" — that would be fake success.
  return {
    ok: false,
    reason: "not_implemented",
    message:
      "REA publish adapter is scaffolded but listing upsert is not implemented — no fake published status. Wire Listing Hub (or documented feed) after partner API smoke.",
    placement: {
      channel: "rea",
      status: "error",
      providerAdId,
      reaAgencyId:
        input.reaAgencyId ??
        (typeof prevRea.reaAgencyId === "string" ? prevRea.reaAgencyId : null) ??
        tokens.reaAgencyId ??
        null,
      lastSyncedAt: null,
      lastError: "not_implemented",
      path: null,
    },
  };
}
