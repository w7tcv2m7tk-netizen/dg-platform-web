/**
 * Dreamscape / SecureAPI SOAP (API-1.3) — Reseller ID + API Key auth.
 *
 * Public REST docs (doc-reseller-api) use Api-Request-Id + Api-Signature and
 * do NOT use Reseller ID. The Reseller Console “API & WHMCS → API Setup”
 * Reseller ID + API Key pair matches this legacy SOAP interface (WHMCS-era).
 *
 * WSDL: https://soap.secureapi.com.au/wsdl/API-1.3.wsdl
 * Domain availability: DomainCheck
 * Auth: SOAP header Authenticate { ResellerID, APIKey }
 */

export const DREAMSCAPE_SOAP_NS = "https://soap.secureapi.com.au/API-1.3";

/** Production SOAP endpoint (from WSDL API-1.3Port). */
export const DREAMSCAPE_SOAP_PROD_ENDPOINT =
  "https://soap.secureapi.com.au/server.php?v=1.3";

/** Sandbox / test SOAP endpoint (from test WSDL). */
export const DREAMSCAPE_SOAP_SANDBOX_ENDPOINT =
  "https://soap-test.secureapi.com.au/server.php?v=1.3";

export const DREAMSCAPE_SOAP_PROD_WSDL =
  "https://soap.secureapi.com.au/wsdl/API-1.3.wsdl";

export const DREAMSCAPE_SOAP_SANDBOX_WSDL =
  "https://soap-test.secureapi.com.au/wsdl/API-1.3.wsdl";

export const DREAMSCAPE_SOAP_DOMAIN_CHECK_ACTION =
  "urn:API-1.3#API-1.3Server#DomainCheck";

export const DREAMSCAPE_SOAP_GET_BALANCE_ACTION =
  "urn:API-1.3#API-1.3Server#GetBalance";

export type DreamscapeSoapAvailabilityItem = {
  domain: string;
  available: boolean;
  price?: number;
  premium?: boolean;
  raw?: unknown;
};

export class DreamscapeSoapError extends Error {
  readonly status: number;
  readonly body: string;
  readonly code?: string;
  readonly hint?: string;
  readonly providerBodySnippet?: string | null;
  readonly isSandbox: boolean;
  readonly endpoint: string;

  constructor(
    status: number,
    message: string,
    body: string,
    opts: {
      code?: string;
      hint?: string;
      providerBodySnippet?: string | null;
      isSandbox: boolean;
      endpoint: string;
    },
  ) {
    super(message);
    this.name = "DreamscapeSoapError";
    this.status = status;
    this.body = body;
    this.code = opts.code;
    this.hint = opts.hint;
    this.providerBodySnippet = opts.providerBodySnippet;
    this.isSandbox = opts.isSandbox;
    this.endpoint = opts.endpoint;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeSnippet(text: string, maxLen = 400): string | null {
  let out = text.replace(/\s+/g, " ").trim();
  if (!out) return null;
  out = out.replace(/\b[a-f0-9]{32,}\b/gi, "[redacted]");
  if (out.length > maxLen) return `${out.slice(0, maxLen)}…`;
  return out;
}

/** Minimal tag text extractor (SOAP responses are small and structured). */
export function soapTagText(xml: string, tag: string): string | null {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}>`,
    "i",
  );
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function soapBool(raw: string | null | undefined): boolean | undefined {
  if (raw == null) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

function readServerEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

function resolveHttpsProxy(): string | null {
  const raw =
    readServerEnv("DREAMSCAPE_HTTPS_PROXY")?.trim() ||
    readServerEnv("HTTPS_PROXY")?.trim() ||
    readServerEnv("https_proxy")?.trim() ||
    "";
  return raw || null;
}

/**
 * Build SOAP 1.1 RPC/encoded DomainCheck envelope with Authenticate header.
 * Matches SecureAPI API-1.3 / node-dreamscape header shape.
 */
export function buildDomainCheckEnvelope(opts: {
  resellerId: string;
  apiKey: string;
  domains: string[];
}): string {
  const { resellerId, apiKey, domains } = opts;
  const items = domains
    .map((d) => `<item xsi:type="xsd:string">${escapeXml(d)}</item>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${DREAMSCAPE_SOAP_NS}" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Header>
    <ns1:Authenticate>
      <AuthenticateRequest xsi:type="ns1:AuthenticateRequest">
        <ResellerID xsi:type="xsd:string">${escapeXml(resellerId)}</ResellerID>
        <APIKey xsi:type="xsd:string">${escapeXml(apiKey)}</APIKey>
      </AuthenticateRequest>
    </ns1:Authenticate>
  </SOAP-ENV:Header>
  <SOAP-ENV:Body>
    <ns1:DomainCheck>
      <DomainCheckRequest xsi:type="ns1:DomainCheckRequest">
        <DomainNames SOAP-ENC:arrayType="xsd:string[${domains.length}]" xsi:type="SOAP-ENC:Array">
          ${items}
        </DomainNames>
      </DomainCheckRequest>
    </ns1:DomainCheck>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

export function buildGetBalanceEnvelope(opts: {
  resellerId: string;
  apiKey: string;
}): string {
  const { resellerId, apiKey } = opts;
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${DREAMSCAPE_SOAP_NS}" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Header>
    <ns1:Authenticate>
      <AuthenticateRequest xsi:type="ns1:AuthenticateRequest">
        <ResellerID xsi:type="xsd:string">${escapeXml(resellerId)}</ResellerID>
        <APIKey xsi:type="xsd:string">${escapeXml(apiKey)}</APIKey>
      </AuthenticateRequest>
    </ns1:Authenticate>
  </SOAP-ENV:Header>
  <SOAP-ENV:Body>
    <ns1:GetBalance/>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

/**
 * Parse DomainCheck SOAP XML into availability rows.
 * AvailabilityItem: Item (domain), Available, Price?, IsPremium?
 */
export function parseDomainCheckResponse(
  xml: string,
): DreamscapeSoapAvailabilityItem[] {
  const items: DreamscapeSoapAvailabilityItem[] = [];
  const blockRe =
    /<(?:[\w.-]+:)?AvailabilityItem\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?AvailabilityItem>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(xml)) !== null) {
    const block = match[1];
    const domain = soapTagText(block, "Item");
    if (!domain) continue;
    const available = soapBool(soapTagText(block, "Available")) ?? false;
    const priceRaw = soapTagText(block, "Price");
    const price =
      priceRaw != null && priceRaw !== "" && !Number.isNaN(Number(priceRaw))
        ? Number(priceRaw)
        : undefined;
    const premium = soapBool(soapTagText(block, "IsPremium"));
    items.push({
      domain: domain.toLowerCase(),
      available,
      price,
      premium,
      raw: {
        Item: domain,
        Available: available,
        Price: price,
        IsPremium: premium,
      },
    });
  }

  if (items.length === 0) {
    const looseRe =
      /<(?:[\w.-]+:)?Item\b[^>]*>([^<]+)<\/(?:[\w.-]+:)?Item>[\s\S]{0,200}<(?:[\w.-]+:)?Available\b[^>]*>([^<]+)<\/(?:[\w.-]+:)?Available>/gi;
    let loose: RegExpExecArray | null;
    while ((loose = looseRe.exec(xml)) !== null) {
      items.push({
        domain: loose[1].trim().toLowerCase(),
        available: soapBool(loose[2]) ?? false,
      });
    }
  }

  return items;
}

export function extractSoapFault(xml: string): string | null {
  return (
    soapTagText(xml, "faultstring") ??
    soapTagText(xml, "FaultString") ??
    soapTagText(xml, "faultString") ??
    soapTagText(xml, "ErrorMessage") ??
    soapTagText(xml, "Message")
  );
}

export function soapResponseIndicatesAuthFailure(xml: string): boolean {
  const lower = xml.toLowerCase();
  if (
    lower.includes("unauthoriz") ||
    lower.includes("authentication") ||
    (lower.includes("authenticate") && lower.includes("fail")) ||
    lower.includes("invalid api") ||
    lower.includes("invalid reseller") ||
    lower.includes("access denied")
  ) {
    return true;
  }
  const success = soapBool(soapTagText(xml, "Success"));
  const errors = soapTagText(xml, "Errors");
  if (success === false && errors) {
    const errLower = errors.toLowerCase();
    if (
      errLower.includes("auth") ||
      errLower.includes("api key") ||
      errLower.includes("reseller")
    ) {
      return true;
    }
  }
  return false;
}

type ProxyDispatcher = { close?: () => Promise<void> };

let cachedProxy: {
  url: string;
  dispatcher: ProxyDispatcher;
  fetch: typeof fetch;
} | null = null;

async function loadUndici(): Promise<typeof import("undici")> {
  const importer = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<typeof import("undici")>;
  return importer("undici");
}

async function resolveProxiedFetch(proxyUrl: string): Promise<{
  fetch: typeof fetch;
  dispatcher: ProxyDispatcher;
}> {
  if (cachedProxy?.url === proxyUrl) {
    return { fetch: cachedProxy.fetch, dispatcher: cachedProxy.dispatcher };
  }
  const undici = await loadUndici();
  const dispatcher = new undici.ProxyAgent(proxyUrl);
  const proxiedFetch = undici.fetch as unknown as typeof fetch;
  cachedProxy = { url: proxyUrl, dispatcher, fetch: proxiedFetch };
  return { fetch: proxiedFetch, dispatcher };
}

function authHint(isSandbox: boolean): string {
  return isSandbox
    ? "SOAP auth = Reseller ID + API Key (API Setup). Use sandbox console keys with DREAMSCAPE_SOAP_ENV=sandbox → soap-test.secureapi.com.au. Live console keys need DREAMSCAPE_SOAP_ENV=production."
    : "SOAP auth = Reseller ID + API Key (API Setup). Live console → DREAMSCAPE_SOAP_ENV=production → soap.secureapi.com.au. Do not use soap-test with live keys.";
}

async function soapPost(opts: {
  endpoint: string;
  soapAction: string;
  body: string;
  isSandbox: boolean;
}): Promise<string> {
  const { endpoint, soapAction, body, isSandbox } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
    SOAPAction: `"${soapAction}"`,
    Accept: "text/xml, application/soap+xml, */*",
  };

  console.info("[dreamscape] soap request", {
    endpoint,
    soapAction,
    isSandbox,
    auth: "SOAP header Authenticate (ResellerID + APIKey)",
  });

  const proxyUrl = resolveHttpsProxy();
  let response: Response;
  if (proxyUrl) {
    const { fetch: proxiedFetch, dispatcher } =
      await resolveProxiedFetch(proxyUrl);
    response = await proxiedFetch(endpoint, {
      method: "POST",
      headers,
      body,
      ...({ dispatcher } as RequestInit),
    });
  } else {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });
  }

  const text = await response.text();
  const providerBodySnippet = sanitizeSnippet(text);

  if (!response.ok) {
    const authish =
      response.status === 401 ||
      response.status === 403 ||
      soapResponseIndicatesAuthFailure(text);
    throw new DreamscapeSoapError(
      authish ? 401 : response.status,
      authish
        ? "Dreamscape SOAP rejected the request (auth failure)."
        : `Dreamscape SOAP HTTP ${response.status}`,
      text,
      {
        code: authish
          ? isSandbox
            ? "auth_soap_sandbox_rejected"
            : "auth_soap_production_rejected"
          : "provider_error",
        hint: authish ? authHint(isSandbox) : undefined,
        providerBodySnippet,
        isSandbox,
        endpoint,
      },
    );
  }

  const fault = extractSoapFault(text);
  if (
    (fault && /auth|unauthor|api key|reseller|denied/i.test(fault)) ||
    soapResponseIndicatesAuthFailure(text)
  ) {
    throw new DreamscapeSoapError(
      401,
      fault
        ? `Dreamscape SOAP fault: ${fault}`
        : "Dreamscape SOAP returned an auth/error response",
      text,
      {
        code: isSandbox
          ? "auth_soap_sandbox_rejected"
          : "auth_soap_production_rejected",
        hint: authHint(isSandbox),
        providerBodySnippet,
        isSandbox,
        endpoint,
      },
    );
  }

  if (fault) {
    throw new DreamscapeSoapError(502, `Dreamscape SOAP fault: ${fault}`, text, {
      code: "provider_error",
      providerBodySnippet,
      isSandbox,
      endpoint,
    });
  }

  return text;
}

/** DomainCheck via SecureAPI SOAP. */
export async function dreamscapeSoapDomainCheck(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  domains: string[];
  isSandbox: boolean;
}): Promise<DreamscapeSoapAvailabilityItem[]> {
  const envelope = buildDomainCheckEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
    domains: opts.domains,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_DOMAIN_CHECK_ACTION,
    body: envelope,
    isSandbox: opts.isSandbox,
  });
  return parseDomainCheckResponse(xml);
}

/** Lightweight SOAP reachability (GetBalance). */
export async function dreamscapeSoapGetBalance(opts: {
  endpoint: string;
  resellerId: string;
  apiKey: string;
  isSandbox: boolean;
}): Promise<{ balance: string | null; raw: string }> {
  const envelope = buildGetBalanceEnvelope({
    resellerId: opts.resellerId,
    apiKey: opts.apiKey,
  });
  const xml = await soapPost({
    endpoint: opts.endpoint,
    soapAction: DREAMSCAPE_SOAP_GET_BALANCE_ACTION,
    body: envelope,
    isSandbox: opts.isSandbox,
  });
  return { balance: soapTagText(xml, "Balance"), raw: xml };
}
