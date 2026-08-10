/**
 * Domain Listings Management syndication adapter.
 * Prefers org OAuth tokens; falls back to platform client-credentials for smoke validation.
 */

import {
  domainCredentialsConfigured,
  ensureValidOrgDomainAccessToken,
  fetchDomainClientCredentialsToken,
} from "../../connectors/domain/auth";
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

    if (input.organisationId) {
      const orgToken = await ensureValidOrgDomainAccessToken(input.organisationId);
      if (orgToken.ok) {
        return {
          ok: true,
          status: "draft",
          message: "Domain org credentials OK — Listings Management write not wired yet",
        };
      }
    }

    const token = await fetchDomainClientCredentialsToken();
    if (!token.ok) {
      return { ok: false, status: "error", message: token.message, raw: token.raw };
    }
    return {
      ok: true,
      status: "draft",
      message:
        "Domain platform credentials OK — connect an org Domain account for agency-context publish",
    };
  },

  async publish(input: SyndicationListingInput): Promise<SyndicationResult> {
    const base = await this.validate(input);
    if (!base.ok) return base;
    return {
      ok: false,
      status: "pending",
      message:
        "Domain Listings Management publish MVP next — credentials + token path ready",
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
      message: "Domain withdraw not implemented yet",
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
