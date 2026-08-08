import type { DomainProvider } from "../../domains/provider";
import {
  InfrastructureNotConfiguredError,
  InfrastructureNotImplementedError,
  type Domain,
  type DomainAvailability,
  type RegisterDomainParams,
  type RenewDomainParams,
  type TransferDomainParams,
  type UpdateDomainParams,
} from "../../core/types";
import {
  DreamscapeApiError,
  dreamscapeFetch,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
} from "./client";
import {
  DreamscapeSoapError,
  dreamscapeSoapDomainCheck,
  dreamscapeSoapGetBalance,
} from "./soap";

function normalizeDomainQuery(query: string | string[]): string[] {
  const parts = Array.isArray(query) ? query : query.split(/[\s,]+/);
  return [
    ...new Set(
      parts
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
        .map((d) => (d.includes(".") ? d : `${d}.com.au`)),
    ),
  ].slice(0, 20);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickBoolean(row: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "boolean") return v;
    if (v === 1 || v === "1" || v === "true") return true;
    if (v === 0 || v === "0" || v === "false") return false;
  }
  return undefined;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

function unwrapAvailabilityRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];

  for (const key of ["data", "domains", "results", "items"]) {
    const nested = root[key];
    if (Array.isArray(nested)) return nested;
    const nestedObj = asRecord(nested);
    if (nestedObj) {
      for (const inner of ["data", "domains", "results", "items"]) {
        if (Array.isArray(nestedObj[inner])) return nestedObj[inner] as unknown[];
      }
    }
  }

  if (
    pickString(root, ["domain_name", "domainName", "domain", "name"]) ||
    pickBoolean(root, ["available", "is_available", "isAvailable"]) !== undefined
  ) {
    return [root];
  }

  return [];
}

function mapAvailabilityRow(row: unknown): DomainAvailability | null {
  const obj = asRecord(row);
  if (!obj) return null;

  const domain = pickString(obj, [
    "domain_name",
    "domainName",
    "domain",
    "name",
    "fqdn",
  ]);
  if (!domain) return null;

  const available =
    pickBoolean(obj, ["available", "is_available", "isAvailable", "isFree"]) ??
    false;

  const price = pickNumber(obj, ["price", "price_cents", "priceCents", "amount"]);
  const hasCentsKey = "price_cents" in obj || "priceCents" in obj;
  const priceCents =
    price === undefined
      ? undefined
      : hasCentsKey
        ? Math.round(price)
        : price < 1000
          ? Math.round(price * 100)
          : Math.round(price);

  return {
    domain: domain.toLowerCase(),
    available,
    premium: pickBoolean(obj, ["premium", "is_premium", "isPremium"]),
    priceCents,
    currency: pickString(obj, ["currency", "currency_code", "currencyCode"])?.toUpperCase(),
    providerId: "dreamscape",
    raw: row,
  };
}

function mapSoapAvailability(
  domains: string[],
  rows: Awaited<ReturnType<typeof dreamscapeSoapDomainCheck>>,
): DomainAvailability[] {
  const byName = new Map(
    rows.map((r) => {
      const priceCents =
        r.price === undefined
          ? undefined
          : r.price < 1000
            ? Math.round(r.price * 100)
            : Math.round(r.price);
      const mapped: DomainAvailability = {
        domain: r.domain,
        available: r.available,
        premium: r.premium,
        priceCents,
        currency: priceCents !== undefined ? "AUD" : undefined,
        providerId: "dreamscape",
        raw: r.raw ?? r,
      };
      return [r.domain, mapped] as const;
    }),
  );

  return domains.map(
    (domain) =>
      byName.get(domain) ?? {
        domain,
        available: false,
        providerId: "dreamscape" as const,
        raw: { note: "missing_from_provider_response" },
      },
  );
}

function soapErrorToApiError(err: DreamscapeSoapError): DreamscapeApiError {
  return new DreamscapeApiError(err.status, err.message, err.body, {
    code: err.code,
    hint: err.hint,
    providerBodySnippet: err.providerBodySnippet,
    requestDebug: {
      path: err.endpoint,
      method: "POST",
      headersSent: ["Content-Type", "SOAPAction", "Accept"],
      resellerIdHeadersSent: ["SOAP Authenticate/ResellerID"],
      queryKeysSent: [],
      hasResellerIdQuery: false,
      sendResellerId: true,
      signatureAlgo: "md5(request_id + api_key)",
      isSandbox: err.isSandbox,
      apiMode: "soap",
    },
  });
}

/**
 * DreamscapeDomainProvider — first DomainProvider adapter.
 * SOAP (Reseller ID + API Key) when DREAMSCAPE_RESELLER_ID is set or
 * DREAMSCAPE_API_MODE=soap; otherwise REST (Api-Request-Id + Api-Signature).
 * @see https://doc-reseller-api.ds.network/ (REST)
 * @see https://soap.secureapi.com.au/wsdl/API-1.3.wsdl (SOAP)
 */
export class DreamscapeDomainProvider implements DomainProvider {
  readonly id = "dreamscape";
  /** Internal only — never show this string in customer UX */
  readonly displayName = "Dreamscape";

  async search(query: string | string[]): Promise<DomainAvailability[]> {
    if (!isDreamscapeConfigured()) {
      const { apiMode } = resolveDreamscapeConfig();
      throw new InfrastructureNotConfiguredError(
        apiMode === "soap"
          ? "Set DREAMSCAPE_API_KEY + DREAMSCAPE_RESELLER_ID (SOAP / API Setup) to enable domain search"
          : "Set DREAMSCAPE_API_KEY (sandbox Reseller Console → API Setup) to enable domain search",
      );
    }

    const domains = normalizeDomainQuery(query);
    if (domains.length === 0) return [];

    const { apiMode, apiKey, resellerId, soapEndpoint, isSandbox } =
      resolveDreamscapeConfig();

    if (apiMode === "soap") {
      if (!apiKey || !resellerId) {
        throw new InfrastructureNotConfiguredError(
          "SOAP mode requires DREAMSCAPE_API_KEY and DREAMSCAPE_RESELLER_ID",
        );
      }
      try {
        const rows = await dreamscapeSoapDomainCheck({
          endpoint: soapEndpoint,
          resellerId,
          apiKey,
          domains,
          isSandbox,
        });
        return mapSoapAvailability(domains, rows);
      } catch (err) {
        if (err instanceof DreamscapeSoapError) {
          throw soapErrorToApiError(err);
        }
        throw err;
      }
    }

    const searchParams = new URLSearchParams();
    for (const domain of domains) {
      searchParams.append("domain_names[]", domain);
    }

    const payload = await dreamscapeFetch<unknown>("/domains/availability", {
      method: "GET",
      searchParams,
    });

    const mapped = unwrapAvailabilityRows(payload)
      .map(mapAvailabilityRow)
      .filter((row): row is DomainAvailability => row !== null);

    const byName = new Map(mapped.map((m) => [m.domain, m]));
    return domains.map(
      (domain) =>
        byName.get(domain) ?? {
          domain,
          available: false,
          providerId: "dreamscape" as const,
          raw: { note: "missing_from_provider_response" },
        },
    );
  }

  async register(_params: RegisterDomainParams): Promise<Domain> {
    throw new InfrastructureNotImplementedError(this.id, "register");
  }

  async renew(_domainId: string, _params?: RenewDomainParams): Promise<Domain> {
    throw new InfrastructureNotImplementedError(this.id, "renew");
  }

  async transfer(_params: TransferDomainParams): Promise<Domain> {
    throw new InfrastructureNotImplementedError(this.id, "transfer");
  }

  async get(_domainId: string): Promise<Domain | null> {
    throw new InfrastructureNotImplementedError(this.id, "get");
  }

  async update(
    _domainId: string,
    _params: UpdateDomainParams,
  ): Promise<Domain> {
    throw new InfrastructureNotImplementedError(this.id, "update");
  }

  async list(_providerCustomerId?: string): Promise<Domain[]> {
    throw new InfrastructureNotImplementedError(this.id, "list");
  }

  /** Sandbox/prod reachability — Command Centre / ops */
  async healthCheck(): Promise<{
    ok: boolean;
    isSandbox: boolean;
    baseUrl: string;
    apiMode: "soap" | "rest";
    message: string;
  }> {
    const {
      apiKey,
      resellerId,
      baseUrl,
      soapEndpoint,
      activeEndpoint,
      isSandbox,
      apiMode,
    } = resolveDreamscapeConfig();
    if (!apiKey) {
      return {
        ok: false,
        isSandbox,
        baseUrl: activeEndpoint,
        apiMode,
        message: "DREAMSCAPE_API_KEY is not set",
      };
    }
    if (apiMode === "soap" && !resellerId) {
      return {
        ok: false,
        isSandbox,
        baseUrl: soapEndpoint,
        apiMode,
        message: "DREAMSCAPE_RESELLER_ID is required for SOAP mode",
      };
    }

    try {
      if (apiMode === "soap" && resellerId) {
        await dreamscapeSoapGetBalance({
          endpoint: soapEndpoint,
          resellerId,
          apiKey,
          isSandbox,
        });
        return {
          ok: true,
          isSandbox,
          baseUrl: soapEndpoint,
          apiMode,
          message: isSandbox
            ? "Sandbox SOAP reachable"
            : "Production SOAP reachable — confirm tests passed before provisioning",
        };
      }

      await dreamscapeFetch("/currencies", { method: "GET" });
      return {
        ok: true,
        isSandbox,
        baseUrl,
        apiMode,
        message: isSandbox
          ? "Sandbox REST API reachable"
          : "Production REST API reachable — confirm tests passed before provisioning",
      };
    } catch (err) {
      if (err instanceof DreamscapeSoapError) {
        return {
          ok: false,
          isSandbox,
          baseUrl: soapEndpoint,
          apiMode,
          message: err.message,
        };
      }
      return {
        ok: false,
        isSandbox,
        baseUrl: activeEndpoint,
        apiMode,
        message:
          err instanceof DreamscapeApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Health check failed",
      };
    }
  }
}

/** @deprecated Prefer DreamscapeDomainProvider — kept for callers during rename */
export const DreamscapeProvider = DreamscapeDomainProvider;
