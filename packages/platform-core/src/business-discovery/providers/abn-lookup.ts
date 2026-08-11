import { resolveAbrGuid } from "../../connectors/abr/client";
import { allBlocks, stripNs, textBetween } from "../../connectors/abr/xml";
import type { DiscoveryCandidate } from "../types";
import { candidateKey, type BusinessDataProvider, type ProviderSearchContext } from "./types";

/**
 * Australian Business Register (ABN Lookup) name search.
 * Free after GUID registration — use for verification / name discovery, not geo radius.
 * Shares server-only GUID with ABR connector (ABN_LOOKUP_GUID | ABR_GUID | ABR_AUTHENTICATION_GUID).
 * @see https://abr.business.gov.au/Tools/WebServices
 */

export const abnLookupProvider: BusinessDataProvider = {
  id: "abn_lookup",
  label: "ABN Lookup",
  isConfigured() {
    return Boolean(resolveAbrGuid());
  },
  unavailableReason() {
    if (resolveAbrGuid()) return undefined;
    return "Set ABN_LOOKUP_GUID (or ABR_GUID) from abr.business.gov.au web services registration";
  },
  async search(ctx: ProviderSearchContext): Promise<DiscoveryCandidate[]> {
    const guid = resolveAbrGuid();
    if (!guid) return [];

    // ABR is name-oriented — skip weak geo-only queries with no distinctive terms.
    const name = ctx.textQuery
      .replace(/\bin\b.+$/i, "")
      .replace(/\b(near|around)\b.+$/i, "")
      .trim();
    if (name.length < 3) return [];

    const url = new URL(
      "https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByNameAdvancedSimpleProtocol2017",
    );
    url.searchParams.set("name", name.slice(0, 200));
    url.searchParams.set("maxResults", String(Math.min(ctx.limit, 20)));
    url.searchParams.set("authenticationGuid", guid);
    // Active trading entities preference
    url.searchParams.set("activeABNsOnly", "Y");
    url.searchParams.set("NSW", "Y");
    url.searchParams.set("SA", "Y");
    url.searchParams.set("ACT", "Y");
    url.searchParams.set("VIC", "Y");
    url.searchParams.set("WA", "Y");
    url.searchParams.set("NT", "Y");
    url.searchParams.set("QLD", "Y");
    url.searchParams.set("TAS", "Y");
    url.searchParams.set("legalName", "Y");
    url.searchParams.set("tradingName", "Y");
    url.searchParams.set("businessName", "Y");

    const res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "text/xml" },
    });
    if (!res.ok) {
      throw new Error(`ABN Lookup HTTP ${res.status}`);
    }

    const xml = stripNs(await res.text());
    const exception = textBetween(xml, "exceptionDescription");
    if (exception && /guid|authentication|not authorised/i.test(exception)) {
      throw new Error(exception);
    }

    const blocks = allBlocks(xml, "searchResultsRecord");
    return blocks
      .slice(0, ctx.limit)
      .map((block): DiscoveryCandidate | null => {
        const abn = textBetween(block, "identifierValue");
        const businessName =
          textBetween(block, "organisationName") ||
          textBetween(block, "fullName") ||
          undefined;
        if (!abn || !businessName) return null;

        const state = textBetween(block, "stateCode");
        const postcode = textBetween(block, "postcode");
        const location = [state, postcode].filter(Boolean).join(" ") || ctx.location;

        return {
          key: candidateKey("abn_lookup", abn),
          provider: "abn_lookup",
          externalId: abn,
          businessName: businessName.trim(),
          location,
          providerRefs: { abn },
          confidence: 0.6,
        };
      })
      .filter((c): c is DiscoveryCandidate => Boolean(c));
  },
};
