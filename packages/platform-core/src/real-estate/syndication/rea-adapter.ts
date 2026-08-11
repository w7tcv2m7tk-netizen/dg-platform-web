/**
 * REA (realestate.com.au) syndication adapter scaffold.
 * Mirrors Domain's SyndicationChannelAdapter; fail closed until partner API is live.
 */

import {
  ensureValidOrgReaAccessToken,
  reaCredentialsConfigured,
  reaOAuthEndpointsConfigured,
} from "../../connectors/rea/auth";
import { publishPropertyToRea } from "../../connectors/rea/publish-property";
import type {
  ListingPlacementSnapshot,
  SyndicationChannelAdapter,
  SyndicationListingInput,
  SyndicationResult,
} from "./types";

export const reaSyndicationAdapter: SyndicationChannelAdapter = {
  channel: "rea",

  async validate(input: SyndicationListingInput): Promise<SyndicationResult> {
    if (!reaCredentialsConfigured()) {
      return {
        ok: false,
        status: "error",
        message:
          "REA OAuth not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET after partner access",
      };
    }
    if (!reaOAuthEndpointsConfigured()) {
      return {
        ok: false,
        status: "error",
        message:
          "REA OAuth endpoints unknown — set REA_AUTH_AUTHORIZE_URL + REA_AUTH_TOKEN_URL from partner docs",
      };
    }
    if (!input.listingId || !input.propertyId) {
      return {
        ok: false,
        status: "error",
        message: "listingId and propertyId are required",
      };
    }
    if (!input.organisationId) {
      return {
        ok: false,
        status: "error",
        message: "organisationId is required for REA publish",
      };
    }

    const orgToken = await ensureValidOrgReaAccessToken(input.organisationId);
    if (!orgToken.ok) {
      return {
        ok: false,
        status: "error",
        message: orgToken.message,
      };
    }

    return {
      ok: true,
      status: "draft",
      message: "REA org credentials OK — ready when listing upsert is implemented",
    };
  },

  async publish(input: SyndicationListingInput): Promise<SyndicationResult> {
    const propertyId =
      (typeof input.payload.propertyId === "string" && input.payload.propertyId) ||
      input.propertyId;

    const result = await publishPropertyToRea({
      organisationId: input.organisationId,
      propertyId,
      actorId:
        typeof input.payload.actorId === "string" ? input.payload.actorId : undefined,
      reaAgencyId:
        typeof input.payload.reaAgencyId === "string"
          ? input.payload.reaAgencyId
          : undefined,
    });

    if (!result.ok) {
      return {
        ok: false,
        status: "error",
        message: result.message,
        externalId: result.placement?.providerAdId ?? null,
        raw: {
          placement: result.placement,
          reason: result.reason,
          upstream: result.raw,
        },
      };
    }

    return {
      ok: true,
      status: "pending",
      externalId: result.placement.providerAdId,
      message: result.message,
      raw: result.raw,
    };
  },

  async update(input: SyndicationListingInput): Promise<SyndicationResult> {
    return this.publish(input);
  },

  async withdraw(input: SyndicationListingInput): Promise<SyndicationResult> {
    const base = await this.validate(input);
    if (!base.ok) return base;
    return {
      ok: false,
      status: "withdrawn",
      message:
        "REA withdraw not implemented — use REA agency tools or wait for Listing Hub withdraw wiring",
    };
  },

  async getStatus(externalId: string): Promise<ListingPlacementSnapshot> {
    return {
      channel: "rea",
      status: "draft",
      externalId,
      lastSyncedAt: null,
      lastError: "REA status poll not implemented — prefer webhooks when partner access allows",
    };
  },
};
