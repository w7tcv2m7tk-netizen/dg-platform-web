/**
 * REA (realestate.com.au) syndication adapter.
 * Partner Platform client_credentials + Listing Upload (REAXML).
 */

import {
  ensureValidOrgReaAccessToken,
  reaCredentialsConfigured,
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
          "REA Partner credentials not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET on Vercel",
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
      message: "REA org agency bound + platform token OK — ready to upload REAXML",
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
        "REA withdraw not wired in UI yet — use Listing Upload with status=withdrawn or REA agency tools",
    };
  },

  async getStatus(externalId: string): Promise<ListingPlacementSnapshot> {
    return {
      channel: "rea",
      status: "draft",
      externalId,
      lastSyncedAt: null,
      lastError:
        "REA status poll by externalId not implemented — use upload report by uploadId on the property placement",
    };
  },
};
