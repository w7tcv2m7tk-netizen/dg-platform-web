/**
 * ABR ABN Lookup HTTP client.
 * Methods: SearchByABNv202001, SearchByASICv201408 (latest).
 * GUID stays server-side only — never log or return it.
 *
 * @see https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx
 */

import type {
  AbrBusinessName,
  AbrEntitySnapshot,
  AbrLookupMethod,
  AbrLookupResult,
} from "./types";
import { ABR_GUID_ENV_KEYS } from "./types";
import { allBlocks, firstBlock, stripNs, textBetween } from "./xml";

const ABR_BASE =
  "https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx";

export function resolveAbrGuid(): string | undefined {
  for (const key of ABR_GUID_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function abrCredentialsConfigured(): boolean {
  return Boolean(resolveAbrGuid());
}

/** Which env key is set (name only — never the value). */
export function abrGuidEnvKeyPresent(): (typeof ABR_GUID_ENV_KEYS)[number] | null {
  for (const key of ABR_GUID_ENV_KEYS) {
    if (process.env[key]?.trim()) return key;
  }
  return null;
}

export function normalizeAbn(input: string): string {
  return input.replace(/\s+/g, "").replace(/-/g, "");
}

export function normalizeAcn(input: string): string {
  return input.replace(/\s+/g, "").replace(/-/g, "");
}

export function isValidAbnFormat(abn: string): boolean {
  const digits = normalizeAbn(abn);
  if (!/^\d{11}$/.test(digits)) return false;
  // ABN checksum (weights 10,1,3,5,7,9,11,13,15,17,19; subtract 1 from first digit)
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const nums = digits.split("").map(Number);
  nums[0] = nums[0]! - 1;
  const sum = nums.reduce((acc, n, i) => acc + n * weights[i]!, 0);
  return sum % 89 === 0;
}

export function isValidAcnFormat(acn: string): boolean {
  const digits = normalizeAcn(acn);
  if (!/^\d{9}$/.test(digits)) return false;
  // ACN checksum (weights 8,7,6,5,4,3,2,1)
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const nums = digits.split("").map(Number);
  const sum = nums.slice(0, 8).reduce((acc, n, i) => acc + n * weights[i]!, 0);
  const check = (10 - (sum % 10)) % 10;
  return check === nums[8];
}

function collectNames(block: string, tag: string): string[] {
  return allBlocks(block, tag)
    .map((inner) => textBetween(inner, "organisationName") || textBetween(inner, "fullName"))
    .filter((n): n is string => Boolean(n?.trim()))
    .map((n) => n.trim());
}

function collectBusinessNames(block: string): AbrBusinessName[] {
  return allBlocks(block, "businessName")
    .map((inner): AbrBusinessName | null => {
      const organisationName =
        textBetween(inner, "organisationName") || textBetween(inner, "fullName");
      if (!organisationName?.trim()) return null;
      return {
        organisationName: organisationName.trim(),
        effectiveFrom: textBetween(inner, "effectiveFrom"),
        effectiveTo: textBetween(inner, "effectiveTo"),
      };
    })
    .filter((n): n is AbrBusinessName => Boolean(n));
}

function parseEntityBlock(
  xml: string,
  method: AbrLookupMethod,
): AbrEntitySnapshot | null {
  const entityXml = firstBlock(xml, [
    "businessEntity202001",
    "businessEntity201408",
    "businessEntity201205",
    "businessEntity200709",
    "businessEntity",
  ]);
  if (!entityXml) return null;

  const abnBlock = firstBlock(entityXml, ["ABN", "abn"]) ?? "";
  const abn =
    textBetween(abnBlock, "identifierValue") ||
    textBetween(entityXml, "identifierValue");

  const entityStatus =
    textBetween(
      firstBlock(entityXml, ["entityStatus"]) ?? entityXml,
      "entityStatusCode",
    ) || undefined;

  const entityTypeCode = textBetween(
    firstBlock(entityXml, ["entityType"]) ?? "",
    "entityTypeCode",
  );
  const entityTypeDescription = textBetween(
    firstBlock(entityXml, ["entityType"]) ?? "",
    "entityDescription",
  );

  const gstBlock = firstBlock(entityXml, ["goodsAndServicesTax"]);
  const gstEffectiveFrom = gstBlock
    ? textBetween(gstBlock, "effectiveFrom")
    : undefined;
  const gstEffectiveTo = gstBlock ? textBetween(gstBlock, "effectiveTo") : undefined;
  const gstRegistered = gstBlock
    ? !gstEffectiveTo || gstEffectiveTo.toUpperCase() === "0001-01-01"
    : undefined;

  const addressBlock = firstBlock(entityXml, ["mainBusinessPhysicalAddress"]);

  const legalFromMain =
    collectNames(entityXml, "mainName")[0] ||
    collectNames(entityXml, "legalName")[0];
  const tradingNames = [
    ...collectNames(entityXml, "mainTradingName"),
    ...collectNames(entityXml, "tradingName"),
  ];
  const businessNames = collectBusinessNames(entityXml);

  const acn =
    textBetween(entityXml, "ASICNumber") ||
    textBetween(entityXml, "asicNumber") ||
    undefined;

  return {
    method,
    abn: abn ? normalizeAbn(abn) : undefined,
    abnStatus: textBetween(abnBlock, "identifierStatus") || undefined,
    acn: acn ? normalizeAcn(acn) : undefined,
    entityStatus,
    entityType:
      entityTypeCode || entityTypeDescription
        ? { code: entityTypeCode, description: entityTypeDescription }
        : undefined,
    legalName: legalFromMain,
    tradingNames: [...new Set(tradingNames)],
    businessNames,
    gstRegistered,
    gstEffectiveFrom,
    address: addressBlock
      ? {
          stateCode: textBetween(addressBlock, "stateCode"),
          postcode: textBetween(addressBlock, "postcode"),
          country: "AU",
        }
      : undefined,
    retrievedAt: new Date().toISOString(),
  };
}

async function abrGet(
  method: AbrLookupMethod,
  searchString: string,
): Promise<AbrLookupResult> {
  const guid = resolveAbrGuid();
  if (!guid) {
    return {
      ok: false,
      code: "not_configured",
      message:
        "ABR GUID not configured. Set ABN_LOOKUP_GUID (or ABR_GUID / ABR_AUTHENTICATION_GUID) in server .env.local — never in client code.",
    };
  }

  const url = new URL(`${ABR_BASE}/${method}`);
  url.searchParams.set("searchString", searchString);
  url.searchParams.set("includeHistoricalDetails", "N");
  url.searchParams.set("authenticationGuid", guid);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "text/xml" },
    });
  } catch (err) {
    return {
      ok: false,
      code: "upstream_error",
      message: err instanceof Error ? err.message : "ABR request failed",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: "upstream_error",
      message: `ABR HTTP ${res.status}`,
    };
  }

  const xml = stripNs(await res.text());
  const exception =
    textBetween(xml, "exceptionDescription") ||
    textBetween(xml, "exceptionCode");

  if (exception) {
    if (/guid|authentication|not authorised|registered party/i.test(exception)) {
      return {
        ok: false,
        code: "auth_failed",
        message:
          "ABR authentication failed — check the server-side GUID (value never returned to clients).",
      };
    }
    if (/not a valid|invalid identifier|search text is not/i.test(exception)) {
      return { ok: false, code: "invalid_identifier", message: exception };
    }
    if (/no records found|not found/i.test(exception)) {
      return { ok: false, code: "not_found", message: exception };
    }
    return { ok: false, code: "upstream_error", message: exception };
  }

  const entity = parseEntityBlock(xml, method);
  if (!entity?.abn && !entity?.legalName) {
    return {
      ok: false,
      code: "not_found",
      message: "No ABR entity found for that identifier",
    };
  }

  return { ok: true, entity };
}

/** Latest ABR ABN lookup. */
export async function searchByAbn(abn: string): Promise<AbrLookupResult> {
  const digits = normalizeAbn(abn);
  if (!/^\d{11}$/.test(digits)) {
    return {
      ok: false,
      code: "invalid_identifier",
      message: "ABN must be 11 digits",
    };
  }
  if (!isValidAbnFormat(digits)) {
    return {
      ok: false,
      code: "invalid_identifier",
      message: "ABN failed checksum validation",
    };
  }
  return abrGet("SearchByABNv202001", digits);
}

/** Latest ABR ASIC/ACN lookup (returns ABR entity linked to ACN). */
export async function searchByAcn(acn: string): Promise<AbrLookupResult> {
  const digits = normalizeAcn(acn);
  if (!/^\d{9}$/.test(digits)) {
    return {
      ok: false,
      code: "invalid_identifier",
      message: "ACN must be 9 digits",
    };
  }
  return abrGet("SearchByASICv201408", digits);
}

/** @deprecated Use searchByAbn — kept for Business Setup naming. */
export async function verifyAbn(abn: string): Promise<AbrLookupResult> {
  return searchByAbn(abn);
}
