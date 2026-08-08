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

/**
 * DreamscapeDomainProvider — first DomainProvider adapter.
 * Develop against sandbox only until automated tests pass.
 * @see https://doc-reseller-api.ds.network/
 */
export class DreamscapeDomainProvider implements DomainProvider {
  readonly id = "dreamscape";
  /** Internal only — never show this string in customer UX */
  readonly displayName = "Dreamscape";

  async search(query: string | string[]): Promise<DomainAvailability[]> {
    if (!isDreamscapeConfigured()) {
      throw new InfrastructureNotConfiguredError(
        "Set DREAMSCAPE_API_KEY (sandbox Reseller Console → API Setup) to enable domain search",
      );
    }

    const domains = normalizeDomainQuery(query);
    if (domains.length === 0) return [];

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
    message: string;
  }> {
    const { apiKey, baseUrl, isSandbox } = resolveDreamscapeConfig();
    if (!apiKey) {
      return {
        ok: false,
        isSandbox,
        baseUrl,
        message: "DREAMSCAPE_API_KEY is not set",
      };
    }
    try {
      await dreamscapeFetch("/currencies", { method: "GET" });
      return {
        ok: true,
        isSandbox,
        baseUrl,
        message: isSandbox
          ? "Sandbox API reachable"
          : "Production API reachable — confirm tests passed before provisioning",
      };
    } catch (err) {
      return {
        ok: false,
        isSandbox,
        baseUrl,
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
