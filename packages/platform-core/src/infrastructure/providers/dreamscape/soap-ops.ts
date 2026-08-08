/**
 * Dreamscape SecureAPI SOAP provisioning ops (API-1.3).
 * DomainCreate / ContactCreate / DomainDNSUpdate / DomainInfo / …
 * @see https://soap.secureapi.com.au/wsdl/API-1.3.wsdl
 */

import type { DnsRecord, DomainStatus } from "../../core/types";
import {
  DREAMSCAPE_SOAP_NS,
  DreamscapeSoapError,
  soapEscapeXml as escapeXml,
  soapParseBool,
  soapPost,
  soapTagText,
} from "./soap";

export const DREAMSCAPE_SOAP_CONTACT_CREATE_ACTION =
  "urn:API-1.3#API-1.3Server#ContactCreate";
export const DREAMSCAPE_SOAP_DOMAIN_CREATE_ACTION =
  "urn:API-1.3#API-1.3Server#DomainCreate";
export const DREAMSCAPE_SOAP_DOMAIN_DNS_UPDATE_ACTION =
  "urn:API-1.3#API-1.3Server#DomainDNSUpdate";
export const DREAMSCAPE_SOAP_DOMAIN_INFO_ACTION =
  "urn:API-1.3#API-1.3Server#DomainInfo";
export const DREAMSCAPE_SOAP_DOMAIN_RENEW_ACTION =
  "urn:API-1.3#API-1.3Server#DomainRenew";
export const DREAMSCAPE_SOAP_TRANSFER_START_ACTION =
  "urn:API-1.3#API-1.3Server#TransferStart";

function authHeader(resellerId: string, apiKey: string): string {
  return `<SOAP-ENV:Header>
    <ns1:Authenticate>
      <AuthenticateRequest xsi:type="ns1:AuthenticateRequest">
        <ResellerID xsi:type="xsd:string">${escapeXml(resellerId)}</ResellerID>
        <APIKey xsi:type="xsd:string">${escapeXml(apiKey)}</APIKey>
      </AuthenticateRequest>
    </ns1:Authenticate>
  </SOAP-ENV:Header>`;
}

function envelope(header: string, bodyInner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${DREAMSCAPE_SOAP_NS}" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  ${header}
  <SOAP-ENV:Body>
    ${bodyInner}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function xmlString(tag: string, value: string | undefined | null, opts?: { optional?: boolean }): string {
  if (value == null || value === "") {
    return opts?.optional ? "" : `<${tag} xsi:type="xsd:string" xsi:nil="true"/>`;
  }
  return `<${tag} xsi:type="xsd:string">${escapeXml(value)}</${tag}>`;
}

function xmlInt(tag: string, value: number): string {
  return `<${tag} xsi:type="xsd:int">${value}</${tag}>`;
}

function xmlBool(tag: string, value: boolean): string {
  return `<${tag} xsi:type="xsd:boolean">${value ? "true" : "false"}</${tag}>`;
}

function assertApiSuccess(xml: string, endpoint: string, isSandbox: boolean): void {
  const success = soapParseBool(soapTagText(xml, "Success"));
  const errorsBlock = soapTagText(xml, "Errors");
  const messages: string[] = [];
  if (errorsBlock) {
    const msgRe =
      /<(?:[\w.-]+:)?Message\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?Message>/gi;
    let m: RegExpExecArray | null;
    while ((m = msgRe.exec(errorsBlock)) !== null) {
      const t = m[1].trim();
      if (t) messages.push(t);
    }
  }
  if (success === false || messages.length > 0) {
    throw new DreamscapeSoapError(
      400,
      messages[0] || "Dreamscape SOAP operation failed",
      xml,
      {
        code: "provider_error",
        providerBodySnippet: messages.join("; ").slice(0, 400) || null,
        isSandbox,
        endpoint,
      },
    );
  }
}

export type SoapContactCreateParams = {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postCode: string;
  country: string;
  countryCode: string;
  email: string;
  phone?: string;
  mobile?: string;
  /** business | personal — Dreamscape AccountType */
  accountType: string;
  businessName?: string;
  businessNumberType?: string;
  businessNumber?: string;
};

export function buildContactCreateEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  contact: SoapContactCreateParams;
}): string {
  const c = opts.contact;
  const inner = `<ns1:ContactCreate>
      <ContactCreateRequest xsi:type="ns1:ContactCreateRequest">
        ${xmlString("FirstName", c.firstName)}
        ${xmlString("LastName", c.lastName)}
        ${xmlString("Address", c.address)}
        ${xmlString("City", c.city)}
        ${xmlString("State", c.state)}
        ${xmlString("Country", c.country)}
        ${xmlString("PostCode", c.postCode)}
        ${xmlString("CountryCode", c.countryCode)}
        ${c.phone ? xmlString("Phone", c.phone) : ""}
        ${c.mobile ? xmlString("Mobile", c.mobile) : ""}
        ${xmlString("Email", c.email)}
        ${xmlString("AccountType", c.accountType)}
        ${c.businessName ? xmlString("BusinessName", c.businessName, { optional: true }) : ""}
        ${c.businessNumberType ? xmlString("BusinessNumberType", c.businessNumberType, { optional: true }) : ""}
        ${c.businessNumber ? xmlString("BusinessNumber", c.businessNumber, { optional: true }) : ""}
      </ContactCreateRequest>
    </ns1:ContactCreate>`;
  return envelope(authHeader(opts.resellerId, opts.apiKey), inner);
}

export type SoapEligibility = {
  policyReason?: number;
  businessType?: string;
  businessName: string;
  businessNumberType?: string;
  businessNumber: string;
  tradingName?: string;
  tradingNumberType?: string;
  tradingNumber?: string;
  registrantType?: string;
  registrantName?: string;
};

export type SoapNameServer = { host: string; ip?: string };

export type SoapDomainCreateParams = {
  domainName: string;
  registrantContactIdentifier: string;
  adminContactIdentifier: string;
  billingContactIdentifier: string;
  techContactIdentifier: string;
  /** Years (SOAP RegistrationPeriod) — typically 1–5 */
  registrationPeriod: number;
  nameServers?: SoapNameServer[];
  eligibility?: SoapEligibility;
  premium?: boolean;
};

function eligibilityXml(e: SoapEligibility): string {
  return `<Eligibility xsi:type="ns1:Eligibility">
    ${e.policyReason != null ? xmlInt("PolicyReason", e.policyReason) : ""}
    ${e.businessType ? xmlString("BusinessType", e.businessType, { optional: true }) : ""}
    ${xmlString("BusinessName", e.businessName)}
    ${e.businessNumberType ? xmlString("BusinessNumberType", e.businessNumberType, { optional: true }) : ""}
    ${xmlString("BusinessNumber", e.businessNumber)}
    ${e.tradingName ? xmlString("TradingName", e.tradingName, { optional: true }) : ""}
    ${e.tradingNumberType ? xmlString("TradingNumberType", e.tradingNumberType, { optional: true }) : ""}
    ${e.tradingNumber ? xmlString("TradingNumber", e.tradingNumber, { optional: true }) : ""}
    ${e.registrantType ? xmlString("RegistrantType", e.registrantType, { optional: true }) : ""}
    ${e.registrantName ? xmlString("RegistrantName", e.registrantName, { optional: true }) : ""}
  </Eligibility>`;
}

function nameServersXml(servers: SoapNameServer[]): string {
  const items = servers
    .map(
      (ns) => `<item xsi:type="ns1:NameServer">
      ${xmlString("Host", ns.host)}
      ${ns.ip ? xmlString("IP", ns.ip, { optional: true }) : ""}
    </item>`,
    )
    .join("");
  return `<NameServers SOAP-ENC:arrayType="ns1:NameServer[${servers.length}]" xsi:type="SOAP-ENC:Array">
    ${items}
  </NameServers>`;
}

export function buildDomainCreateEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  domain: SoapDomainCreateParams;
}): string {
  const d = opts.domain;
  const inner = `<ns1:DomainCreate>
      <DomainCreateRequest xsi:type="ns1:DomainCreateRequest">
        ${xmlString("DomainName", d.domainName)}
        ${xmlString("RegistrantContactIdentifier", d.registrantContactIdentifier)}
        ${xmlString("AdminContactIdentifier", d.adminContactIdentifier)}
        ${xmlString("BillingContactIdentifier", d.billingContactIdentifier)}
        ${xmlString("TechContactIdentifier", d.techContactIdentifier)}
        ${xmlInt("RegistrationPeriod", d.registrationPeriod)}
        ${d.nameServers?.length ? nameServersXml(d.nameServers) : ""}
        ${d.eligibility ? eligibilityXml(d.eligibility) : ""}
        ${d.premium != null ? xmlBool("Premium", d.premium) : ""}
      </DomainCreateRequest>
    </ns1:DomainCreate>`;
  return envelope(authHeader(opts.resellerId, opts.apiKey), inner);
}

function dnsRecordItems(
  type: "A" | "AAAA" | "CNAME" | "MX",
  records: Array<{ subdomain: string; content: string; priority?: number }>,
): string {
  if (records.length === 0) return "";
  const xsiType =
    type === "A"
      ? "ns1:DNSARecord"
      : type === "AAAA"
        ? "ns1:DNSAAAARecord"
        : type === "CNAME"
          ? "ns1:DNSCNAMERecord"
          : "ns1:DNSMXRecord";
  const arrayType =
    type === "A"
      ? "ns1:DNSARecord"
      : type === "AAAA"
        ? "ns1:DNSAAAARecord"
        : type === "CNAME"
          ? "ns1:DNSCNAMERecord"
          : "ns1:DNSMXRecord";
  const items = records
    .map((r) => {
      const priority =
        type === "MX" && r.priority != null ? xmlInt("Priority", r.priority) : "";
      return `<item xsi:type="${xsiType}">
        ${xmlString("Subdomain", r.subdomain)}
        ${priority}
        ${xmlString("Content", r.content)}
      </item>`;
    })
    .join("");
  return `<${type} SOAP-ENC:arrayType="${arrayType}[${records.length}]" xsi:type="SOAP-ENC:Array">${items}</${type}>`;
}

export function buildDomainDnsUpdateEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  domainName: string;
  records: DnsRecord[];
}): string {
  const a: Array<{ subdomain: string; content: string }> = [];
  const aaaa: Array<{ subdomain: string; content: string }> = [];
  const cname: Array<{ subdomain: string; content: string }> = [];
  const mx: Array<{ subdomain: string; content: string; priority?: number }> = [];

  for (const r of opts.records) {
    const subdomain = r.name === "@" || r.name === opts.domainName ? "" : r.name.replace(/\.$/, "");
    const entry = { subdomain, content: r.content, priority: r.priority };
    const t = r.type.toUpperCase();
    if (t === "A") a.push(entry);
    else if (t === "AAAA") aaaa.push(entry);
    else if (t === "CNAME") cname.push(entry);
    else if (t === "MX") mx.push(entry);
  }

  const recordsXml = `<Records xsi:type="ns1:DNSRecords">
    ${dnsRecordItems("A", a)}
    ${dnsRecordItems("AAAA", aaaa)}
    ${dnsRecordItems("CNAME", cname)}
    ${dnsRecordItems("MX", mx)}
  </Records>`;

  const inner = `<ns1:DomainDNSUpdate>
      <DomainDNSUpdateRequest xsi:type="ns1:DomainDNSUpdateRequest">
        ${xmlString("DomainName", opts.domainName)}
        ${recordsXml}
      </DomainDNSUpdateRequest>
    </ns1:DomainDNSUpdate>`;
  return envelope(authHeader(opts.resellerId, opts.apiKey), inner);
}

export function buildDomainInfoEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  domainName: string;
}): string {
  const inner = `<ns1:DomainInfo>
      <DomainInfoRequest xsi:type="ns1:DomainInfoRequest">
        ${xmlString("DomainName", opts.domainName)}
      </DomainInfoRequest>
    </ns1:DomainInfo>`;
  return envelope(authHeader(opts.resellerId, opts.apiKey), inner);
}

export function buildDomainRenewEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  domainName: string;
  renewalPeriod: number;
  premium?: boolean;
}): string {
  const inner = `<ns1:DomainRenew>
      <DomainRenewRequest xsi:type="ns1:DomainRenewRequest">
        ${xmlString("DomainName", opts.domainName)}
        ${xmlInt("RenewalPeriod", opts.renewalPeriod)}
        ${opts.premium != null ? xmlBool("Premium", opts.premium) : ""}
      </DomainRenewRequest>
    </ns1:DomainRenew>`;
  return envelope(authHeader(opts.resellerId, opts.apiKey), inner);
}

export function buildTransferStartEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  domainName: string;
  contactIdentifier: string;
  authKey?: string;
  renewalPeriod?: number;
}): string {
  const inner = `<ns1:TransferStart>
      <TransferStartRequest xsi:type="ns1:TransferStartRequest">
        ${xmlString("ContactIdentifier", opts.contactIdentifier)}
        ${xmlString("DomainName", opts.domainName)}
        ${opts.authKey ? xmlString("AuthKey", opts.authKey, { optional: true }) : ""}
        ${opts.renewalPeriod != null ? xmlInt("RenewalPeriod", opts.renewalPeriod) : ""}
      </TransferStartRequest>
    </ns1:TransferStart>`;
  return envelope(authHeader(opts.resellerId, opts.apiKey), inner);
}

function mapStatusId(statusId: number | null, statusLabel?: string | null): DomainStatus {
  if (statusId === 1) return "pending";
  if (statusId === 2 || statusId === 3) return "registered";
  if (statusId === 6) return "expired";
  if (statusId === 7 || statusId === 8) return "transferring";
  if (statusId === 5) return "unavailable";
  if (statusLabel) {
    const l = statusLabel.toLowerCase();
    if (l.includes("regist")) return "registered";
    if (l.includes("transfer")) return "transferring";
    if (l.includes("expir")) return "expired";
    if (l.includes("pending") || l.includes("await")) return "pending";
  }
  return "unknown";
}

export type SoapDomainDetails = {
  domainName: string;
  status: DomainStatus;
  statusId: number | null;
  statusLabel: string | null;
  expiresAt?: string;
  nameservers: string[];
  dnsRecords: DnsRecord[];
  registrantContactIdentifier?: string;
  rawXml: string;
};

function parseDnsFromDomainDetails(block: string): DnsRecord[] {
  const records: DnsRecord[] = [];
  const pushType = (type: DnsRecord["type"], tag: string) => {
    const re = new RegExp(
      `<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}>`,
      "gi",
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
      const b = m[1];
      const subdomain = soapTagText(b, "Subdomain") ?? "";
      const content = soapTagText(b, "Content");
      if (!content) continue;
      const priorityRaw = soapTagText(b, "Priority");
      records.push({
        type,
        name: subdomain || "@",
        content,
        priority:
          priorityRaw != null && priorityRaw !== ""
            ? Number(priorityRaw)
            : undefined,
      });
    }
  };
  pushType("A", "DNSARecord");
  pushType("AAAA", "DNSAAAARecord");
  pushType("CNAME", "DNSCNAMERecord");
  pushType("MX", "DNSMXRecord");
  return records;
}

export function parseDomainInfoResponse(xml: string): SoapDomainDetails | null {
  const details =
    soapTagText(xml, "DomainDetails") ??
    (xml.includes("DomainName") ? xml : null);
  if (!details) return null;
  const domainName = soapTagText(details, "DomainName");
  if (!domainName) return null;
  const statusIdRaw = soapTagText(details, "StatusId");
  const statusId =
    statusIdRaw != null && statusIdRaw !== "" && !Number.isNaN(Number(statusIdRaw))
      ? Number(statusIdRaw)
      : null;
  const statusLabel = soapTagText(details, "Status");
  const ns: string[] = [];
  const hostRe =
    /<(?:[\w.-]+:)?Host\b[^>]*>([^<]+)<\/(?:[\w.-]+:)?Host>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hostRe.exec(details)) !== null) {
    ns.push(hm[1].trim());
  }
  return {
    domainName: domainName.toLowerCase(),
    status: mapStatusId(statusId, statusLabel),
    statusId,
    statusLabel,
    expiresAt: soapTagText(details, "Expiry") ?? undefined,
    nameservers: ns,
    dnsRecords: parseDnsFromDomainDetails(details),
    registrantContactIdentifier:
      soapTagText(details, "RegistrantContactIdentifier") ?? undefined,
    rawXml: xml,
  };
}

export async function dreamscapeSoapContactCreate(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
  contact: SoapContactCreateParams;
}): Promise<{ contactIdentifier: string; raw: string }> {
  const body = buildContactCreateEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
    contact: opts.contact,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_CONTACT_CREATE_ACTION,
    body,
    isSandbox: opts.isSandbox,
  });
  assertApiSuccess(xml, opts.endpoint, opts.isSandbox);
  const contactIdentifier =
    soapTagText(xml, "ContactIdentifier") ??
    soapTagText(xml, "contactIdentifier");
  if (!contactIdentifier) {
    throw new DreamscapeSoapError(
      502,
      "ContactCreate succeeded but ContactIdentifier missing",
      xml,
      {
        code: "provider_error",
        isSandbox: opts.isSandbox,
        endpoint: opts.endpoint,
      },
    );
  }
  return { contactIdentifier, raw: xml };
}

export async function dreamscapeSoapDomainCreate(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
  domain: SoapDomainCreateParams;
}): Promise<{ details: SoapDomainDetails | null; raw: string }> {
  const body = buildDomainCreateEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
    domain: opts.domain,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_DOMAIN_CREATE_ACTION,
    body,
    isSandbox: opts.isSandbox,
  });
  assertApiSuccess(xml, opts.endpoint, opts.isSandbox);
  return { details: parseDomainInfoResponse(xml), raw: xml };
}

export async function dreamscapeSoapDomainDnsUpdate(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
  domainName: string;
  records: DnsRecord[];
}): Promise<{ raw: string }> {
  const body = buildDomainDnsUpdateEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
    domainName: opts.domainName,
    records: opts.records,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_DOMAIN_DNS_UPDATE_ACTION,
    body,
    isSandbox: opts.isSandbox,
  });
  assertApiSuccess(xml, opts.endpoint, opts.isSandbox);
  return { raw: xml };
}

export async function dreamscapeSoapDomainInfo(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
  domainName: string;
}): Promise<SoapDomainDetails | null> {
  const body = buildDomainInfoEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
    domainName: opts.domainName,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_DOMAIN_INFO_ACTION,
    body,
    isSandbox: opts.isSandbox,
  });
  assertApiSuccess(xml, opts.endpoint, opts.isSandbox);
  return parseDomainInfoResponse(xml);
}

export async function dreamscapeSoapDomainRenew(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
  domainName: string;
  renewalPeriod: number;
  premium?: boolean;
}): Promise<{ raw: string }> {
  const body = buildDomainRenewEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
    domainName: opts.domainName,
    renewalPeriod: opts.renewalPeriod,
    premium: opts.premium,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_DOMAIN_RENEW_ACTION,
    body,
    isSandbox: opts.isSandbox,
  });
  assertApiSuccess(xml, opts.endpoint, opts.isSandbox);
  return { raw: xml };
}

export async function dreamscapeSoapTransferStart(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
  domainName: string;
  contactIdentifier: string;
  authKey?: string;
  renewalPeriod?: number;
}): Promise<{ raw: string }> {
  const body = buildTransferStartEnvelope(opts);
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_TRANSFER_START_ACTION,
    body,
    isSandbox: opts.isSandbox,
  });
  assertApiSuccess(xml, opts.endpoint, opts.isSandbox);
  return { raw: xml };
}

/** True when TLD typically needs AU eligibility (ABN etc.). */
export function domainNeedsAuEligibility(domain: string): boolean {
  const d = domain.toLowerCase();
  return (
    d.endsWith(".com.au") ||
    d.endsWith(".net.au") ||
    d.endsWith(".org.au") ||
    d.endsWith(".asn.au") ||
    d.endsWith(".id.au")
  );
}
