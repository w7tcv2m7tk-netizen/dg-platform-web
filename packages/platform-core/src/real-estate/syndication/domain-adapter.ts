/**
 * Domain Listings Management syndication adapter.
 * Prefers org OAuth tokens (Authorization Code). Client-credentials is optional /
 * often unsupported on Listing Management clients.
 */

import {
  domainCredentialsConfigured,
  ensureValidOrgDomainAccessToken,
  fetchDomainClientCredentialsToken,
} from "../../connectors/domain/auth";
import { publishPropertyToDomain } from "../../connectors/domain/publish-property";
import type {
  ListingPlacementSnapshot,
  SyndicationChannelAdapter,
  SyndicationListingInput,
  SyndicationResult,
} from "./types";

export const domainSyndicationAdapter: SyndicationChannelAdapter = {
  channel: "domain",

  async validate(input: SyndicationListingInput): Promise<SyndicationResult> {
    if (!domainCredentialsConfigured()) {
      return {
        ok: false,
        status: "error",
        message:
          "Domain OAuth not configured — set DOMAIN_CLIENT_ID + DOMAIN_CLIENT_SECRET on Vercel",
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
        message: "organisationId is required for Domain publish",
      };
    }

    const orgToken = await ensureValidOrgDomainAccessToken(input.organisationId);
    if (orgToken.ok) {
      return {
        ok: true,
        status: "draft",
        message: "Domain org credentials OK — ready to publish via Listings Management",
      };
    }

    const token = await fetchDomainClientCredentialsToken();
    if (!token.ok) {
      const msg = token.message.toLowerCase();
      if (msg.includes("unauthorized_client")) {
        return {
          ok: false,
          status: "error",
          message:
            "Connect a Domain account for this organisation (Listing Management uses Authorization Code; client_credentials is N/A)",
          raw: token.raw,
        };
      }
      return { ok: false, status: "error", message: token.message, raw: token.raw };
    }
    return {
      ok: false,
      status: "error",
      message:
        "Platform credentials OK but agency-context publish needs an org Domain account — Connect under Settings → Connectors",
    };
  },

  async publish(input: SyndicationListingInput): Promise<SyndicationResult> {
    const base = await this.validate(input);
    if (!base.ok) return base;

    const propertyId =
      (typeof input.payload.propertyId === "string" && input.payload.propertyId) ||
      input.propertyId;
    // Until Listing is first-class, Property id is the SoT listing key.
    const result = await publishPropertyToDomain({
      organisationId: input.organisationId,
      propertyId,
      actorId:
        typeof input.payload.actorId === "string" ? input.payload.actorId : undefined,
      domainAgencyId:
        typeof input.payload.domainAgencyId === "number"
          ? input.payload.domainAgencyId
          : undefined,
      contact:
        input.payload.contact && typeof input.payload.contact === "object"
          ? (input.payload.contact as {
              firstName: string;
              lastName: string;
              email: string;
              phone?: string;
            })
          : undefined,
    });

    if (!result.ok) {
      return {
        ok: false,
        status: "error",
        message: result.message,
        externalId: result.placement?.processId ?? null,
        raw: {
          securityReason: result.securityReason,
          placement: result.placement,
          upstream: result.raw,
        },
      };
    }

    return {
      ok: true,
      status: "pending",
      externalId: result.placement.processId ?? result.placement.providerAdId,
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
        "Domain withdraw (off-market) not implemented in this MVP — use Domain extranet or wait for off-market wiring",
    };
  },

  async getStatus(externalId: string): Promise<ListingPlacementSnapshot> {
    return {
      channel: "domain",
      status: "draft",
      externalId,
      lastSyncedAt: null,
      lastError: "Domain status poll not implemented — prefer webhooks when approved",
    };
  },
};
