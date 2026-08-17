import { resolveAbrGuid } from "../../connectors/abr/client";
import { allBlocks, stripNs, textBetween } from "../../connectors/abr/xml";
import { resolveIndustryPack } from "../industry-packs";
import { stateCodeFromLocation } from "../localities";
import type { DiscoveryCandidate } from "../types";
import { candidateKey, type BusinessDataProvider, type ProviderSearchContext } from "./types";

/**
 * Australian Business Register (ABN Lookup) name search.
 * Free after GUID registration — use for verification / name discovery, not geo radius.
 * Shares server-only GUID with ABR connector (ABN_LOOKUP_GUID | ABR_GUID | ABR_AUTHENTICATION_GUID).
 * @see https://abr.business.gov.au/Documentation/WebServiceMethods
 */

const ABR_STATES = ["NSW", "SA", "ACT", "VIC", "WA", "NT", "QLD", "TAS"] as const;

const GENERIC_NAME = /^(agency|business|company|services|group|shop|store)$/i;

function abrSearchName(ctx: ProviderSearchContext): string {
  let name = ctx.textQuery
    .replace(/\bin\b.+$/i, "")
    .replace(/\b(near|around)\b.+$/i, "")
    .trim();
  if (name.length < 3 || GENERIC_NAME.test(name)) {
    const pack = resolveIndustryPack(ctx.industry, ctx.businessType);
    name = pack.searchTerms[0] || name;
  }
  return name.slice(0, 200);
}

function stateFromContext(ctx: ProviderSearchContext): string | undefined {
  if (ctx.stateCode && ABR_STATES.includes(ctx.stateCode as (typeof ABR_STATES)[number])) {
    return ctx.stateCode;
  }
  return stateCodeFromLocation(ctx.location);
}

/** ABR postcode is an exact match — only send digits the user typed, not a suburb guess. */
function postcodeFromContext(ctx: ProviderSearchContext): string {
  const m = ctx.location?.match(/\b(\d{4})\b/);
  return m?.[1] ?? "";
}

const ABR_NAME_SEARCH =
  "https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByNameAdvancedSimpleProtocol2017";

async function abrNameSearchRequest(params: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams(params);
  const post = await fetch(ABR_NAME_SEARCH, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: "text/xml",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (post.ok || post.status !== 500) return post;

  // GET empty `postcode=` is sometimes stripped by proxies → ABR HTTP 500 "Missing parameter".
  const url = new URL(ABR_NAME_SEARCH);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return fetch(url.toString(), {
    method: "GET",
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "text/xml" },
  });
}

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

    const name = abrSearchName(ctx);
    if (name.length < 3) return [];

    const state = stateFromContext(ctx);
    const postcode = postcodeFromContext(ctx);
    const params: Record<string, string> = {
      name,
      postcode,
      legalName: "Y",
      tradingName: "Y",
      businessName: "Y",
      activeABNsOnly: "Y",
      authenticationGuid: guid,
      searchWidth: "typical",
      minimumScore: "50",
      maxSearchResults: String(Math.min(Math.max(ctx.limit, 1), 50)),
    };
    for (const code of ABR_STATES) {
      params[code] = !state || state === code ? "Y" : "N";
    }

    const res = await abrNameSearchRequest(params);
    if (!res.ok) {
      const snippet = (await res.text().catch(() => ""))
        .replace(/authenticationGuid=[^&\s"']+/gi, "authenticationGuid=redacted")
        .replace(/\s+/g, " ")
        .slice(0, 180);
      throw new Error(
        snippet
          ? `ABN Lookup HTTP ${res.status}: ${snippet}`
          : `ABN Lookup HTTP ${res.status}`,
      );
    }

    const xml = stripNs(await res.text());
    const exception = textBetween(xml, "exceptionDescription");
    if (exception) {
      if (/guid|authentication|not authorised/i.test(exception)) {
        throw new Error(exception);
      }
      if (/no records found|not found/i.test(exception)) {
        return [];
      }
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

        const recState = textBetween(block, "stateCode");
        const recPostcode = textBetween(block, "postcode");
        const location = [recState, recPostcode].filter(Boolean).join(" ") || ctx.location;

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
