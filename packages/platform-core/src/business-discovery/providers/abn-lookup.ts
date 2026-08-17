import { resolveAbrGuid } from "../../connectors/abr/client";
import { allBlocks, stripNs, textBetween } from "../../connectors/abr/xml";
import { resolveIndustryPack } from "../industry-packs";
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
  const hay = (ctx.location ?? "").toUpperCase();
  if (/QUEENSLAND|\bQLD\b/.test(hay)) return "QLD";
  if (/NEW SOUTH WALES|\bNSW\b/.test(hay)) return "NSW";
  if (/\bVICTORIA\b|\bVIC\b/.test(hay)) return "VIC";
  if (/SOUTH AUSTRALIA|\bSA\b/.test(hay)) return "SA";
  if (/WESTERN AUSTRALIA|\bWA\b/.test(hay)) return "WA";
  if (/\bTASMANIA\b|\bTAS\b/.test(hay)) return "TAS";
  if (/NORTHERN TERRITORY|\bNT\b/.test(hay)) return "NT";
  if (/AUSTRALIAN CAPITAL|\bACT\b/.test(hay)) return "ACT";
  return undefined;
}

function postcodeFromContext(ctx: ProviderSearchContext): string {
  if (ctx.postcode && /^\d{4}$/.test(ctx.postcode)) return ctx.postcode;
  const m = ctx.location?.match(/\b(\d{4})\b/);
  return m?.[1] ?? "";
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

    const url = new URL(
      "https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByNameAdvancedSimpleProtocol2017",
    );
    url.searchParams.set("name", name);
    url.searchParams.set("postcode", postcode);
    url.searchParams.set("legalName", "Y");
    url.searchParams.set("tradingName", "Y");
    url.searchParams.set("businessName", "Y");
    url.searchParams.set("activeABNsOnly", "Y");
    for (const code of ABR_STATES) {
      url.searchParams.set(code, !state || state === code ? "Y" : "N");
    }
    url.searchParams.set("authenticationGuid", guid);
    url.searchParams.set("searchWidth", "Typical");
    url.searchParams.set("minimumScore", "50");
    url.searchParams.set("maxSearchResults", String(Math.min(Math.max(ctx.limit, 1), 50)));

    const res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "text/xml" },
    });
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
