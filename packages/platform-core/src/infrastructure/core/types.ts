/**
 * Infrastructure Core shared types.
 * Customer-facing product names are DigitalGate Domains / Hosting / Email / DNS / SSL —
 * never expose provider brand (Dreamscape) in UX copy.
 */

export type InfrastructureProviderId =
  | "dreamscape"
  | "cloudflare"
  | "vercel"
  | "aws"
  | "resend"
  | "r2"
  | string;

export type DomainStatus =
  | "available"
  | "unavailable"
  | "registered"
  | "pending"
  | "expired"
  | "transferring"
  | "unknown";

export interface Domain {
  id: string;
  name: string;
  status: DomainStatus;
  providerId: InfrastructureProviderId;
  organisationId?: string;
  /** Linked Dreamscape customer id when provisioned via reseller */
  providerCustomerId?: string;
  expiresAt?: string;
  autoRenew?: boolean;
  nameservers?: string[];
  raw?: unknown;
}

export interface DomainAvailability {
  domain: string;
  available: boolean;
  premium?: boolean;
  priceCents?: number;
  currency?: string;
  providerId: InfrastructureProviderId;
  raw?: unknown;
}

export interface RegisterDomainParams {
  domain: string;
  organisationId: string;
  /** Dreamscape / provider customer id — create via Org mapping if missing */
  providerCustomerId: string;
  periodMonths?: number;
  nameservers?: string[];
  eligibility?: Record<string, unknown>;
}

export interface RenewDomainParams {
  periodMonths?: number;
}

export interface TransferDomainParams {
  domain: string;
  organisationId: string;
  providerCustomerId: string;
  authCode: string;
}

export interface UpdateDomainParams {
  autoRenew?: boolean;
  nameservers?: string[];
  contacts?: Record<string, unknown>;
}

export type DnsRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "TXT"
  | "NS"
  | "CAA"
  | "SRV"
  | "WEBFWD"
  | "MAILFWD"
  | string;

export interface DnsRecord {
  id?: string;
  type: DnsRecordType;
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
  raw?: unknown;
}

export type HostingSiteStatus =
  | "draft"
  | "provisioning"
  | "live"
  | "suspended"
  | "failed"
  | "unknown";

export interface HostingSite {
  id: string;
  name: string;
  status: HostingSiteStatus;
  providerId: InfrastructureProviderId;
  organisationId?: string;
  providerCustomerId?: string;
  primaryDomain?: string;
  url?: string;
  region?: string;
  raw?: unknown;
}

export type SslState =
  | "active"
  | "pending"
  | "expiring"
  | "expired"
  | "missing"
  | "unknown";

export interface SslStatus {
  domain: string;
  state: SslState;
  issuer?: string;
  expiresAt?: string;
  autoManaged: boolean;
  providerId?: InfrastructureProviderId;
  raw?: unknown;
}

export type EmailMailboxStatus = "active" | "pending" | "suspended" | "unknown";

export interface EmailMailbox {
  id: string;
  address: string;
  status: EmailMailboxStatus;
  kind: "business" | "transactional";
  providerId: InfrastructureProviderId;
  organisationId?: string;
  providerCustomerId?: string;
  raw?: unknown;
}

export type InfrastructureHealthStatus =
  | "ok"
  | "degraded"
  | "down"
  | "not_configured";

export interface InfrastructureHealth {
  status: InfrastructureHealthStatus;
  providerId: InfrastructureProviderId;
  checkedAt: string;
  message?: string;
  details?: Record<string, unknown>;
}

/** Provisioning checklist after website publish / domain connect */
export type ProvisioningCheckItemId =
  | "domain"
  | "dns"
  | "hosting"
  | "ssl"
  | "website"
  | "email";

export type ProvisioningCheckState = "pass" | "fail" | "pending" | "skipped" | "unknown";

export interface ProvisioningCheckItem {
  id: ProvisioningCheckItemId;
  label: string;
  state: ProvisioningCheckState;
  detail?: string;
}

export interface ProvisioningHealthChecklist {
  organisationId: string;
  websiteId?: string;
  domain?: string;
  items: ProvisioningCheckItem[];
  score: number;
  checkedAt: string;
}

/**
 * Org ↔ Dreamscape Customer mapping — twin/profile owns which reseller
 * products (domains, hosting, email, SSL) sit under the Organisation.
 */
export interface DreamscapeCustomerLink {
  organisationId: string;
  dreamscapeCustomerId: string;
  /** Optional display name mirrored from Business Profile */
  customerName?: string;
  linkedAt: string;
  productHints?: {
    domains?: boolean;
    hosting?: boolean;
    email?: boolean;
    ssl?: boolean;
  };
}

export class InfrastructureNotImplementedError extends Error {
  constructor(providerId: string, method: string) {
    super(`${providerId}.${method} is not implemented yet`);
    this.name = "InfrastructureNotImplementedError";
  }
}

export class InfrastructureNotConfiguredError extends Error {
  readonly code = "provider_not_configured" as const;

  constructor(message = "Infrastructure provider is not configured") {
    super(message);
    this.name = "InfrastructureNotConfiguredError";
  }
}
