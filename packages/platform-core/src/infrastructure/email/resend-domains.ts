/**
 * Resend Domains API — create / list / get / verify for sending-domain auth.
 * @see https://resend.com/docs/api-reference/domains/create-domain
 */

import type { DnsRecord } from "../core/types";

export type ResendDomainRecord = {
  record?: string;
  name: string;
  type: string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
  region?: string;
  records: ResendDomainRecord[];
  raw?: unknown;
};

function resendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function isResendDomainsConfigured(): boolean {
  return Boolean(resendApiKey());
}

async function resendFetch(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    return { ok: false, status: 503, json: { message: "RESEND_API_KEY not configured" } };
  }
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

function normalizeResendDomain(json: Record<string, unknown>): ResendDomain {
  const recordsRaw = Array.isArray(json.records) ? json.records : [];
  const records: ResendDomainRecord[] = recordsRaw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .map((r) => ({
      record: typeof r.record === "string" ? r.record : undefined,
      name: String(r.name ?? ""),
      type: String(r.type ?? "TXT").toUpperCase(),
      value: String(r.value ?? ""),
      ttl: typeof r.ttl === "string" ? r.ttl : undefined,
      status: typeof r.status === "string" ? r.status : undefined,
      priority:
        typeof r.priority === "number"
          ? r.priority
          : r.priority != null && r.priority !== ""
            ? Number(r.priority)
            : undefined,
    }))
    .filter((r) => r.name || r.value);

  return {
    id: String(json.id ?? ""),
    name: String(json.name ?? "").toLowerCase(),
    status: String(json.status ?? "unknown"),
    region: typeof json.region === "string" ? json.region : undefined,
    records,
    raw: json,
  };
}

/** Strip surrounding quotes Resend sometimes wraps around TXT values. */
export function unwrapTxtValue(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

/** Map Resend DNS host to Dreamscape relative name (@ for apex). */
export function resendHostToRelativeName(
  host: string,
  apexDomain: string,
): string {
  const apex = apexDomain.toLowerCase().replace(/\.$/, "");
  let name = host.trim().toLowerCase().replace(/\.$/, "");
  if (!name || name === "@" || name === apex) return "@";
  if (name.endsWith(`.${apex}`)) {
    name = name.slice(0, -(apex.length + 1));
  }
  return name || "@";
}

export function resendRecordsToDnsRecords(
  domain: ResendDomain,
  apexDomain: string,
): DnsRecord[] {
  const apex = apexDomain.toLowerCase();
  return domain.records
    .filter((r) => {
      const purpose = (r.record ?? "").toLowerCase();
      // Skip Receiving MX on apex if present — only apply sending auth records
      if (purpose === "receiving") return false;
      return Boolean(r.type && r.value);
    })
    .map((r) => {
      const type = r.type.toUpperCase();
      let content = r.value.trim();
      if (type === "TXT") content = unwrapTxtValue(content);
      if (type === "CNAME") content = content.replace(/\.$/, "");
      return {
        type,
        name: resendHostToRelativeName(r.name, apex),
        content,
        priority: type === "MX" ? r.priority ?? 10 : r.priority,
      } satisfies DnsRecord;
    });
}

export async function listResendDomains(): Promise<ResendDomain[]> {
  const { ok, json } = await resendFetch("/domains");
  if (!ok) return [];
  const data = Array.isArray(json.data) ? json.data : [];
  return data
    .filter((d): d is Record<string, unknown> => Boolean(d) && typeof d === "object")
    .map((d) => normalizeResendDomain(d));
}

export async function getResendDomain(
  domainId: string,
): Promise<ResendDomain | null> {
  const { ok, json } = await resendFetch(`/domains/${encodeURIComponent(domainId)}`);
  if (!ok || !json.id) return null;
  return normalizeResendDomain(json);
}

export async function createResendDomain(
  name: string,
  region?: string,
): Promise<{ domain: ResendDomain | null; error?: string; created: boolean }> {
  const body: Record<string, string> = { name: name.toLowerCase() };
  if (region) body.region = region;
  const { ok, status, json } = await resendFetch("/domains", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (ok && json.id) {
    return { domain: normalizeResendDomain(json), created: true };
  }
  const message =
    typeof json.message === "string"
      ? json.message
      : `Resend create domain failed (HTTP ${status})`;
  return { domain: null, error: message, created: false };
}

/**
 * Ensure a Resend sending domain exists; return full domain with DNS records.
 */
export async function ensureResendDomain(
  domainName: string,
): Promise<{ domain: ResendDomain | null; created: boolean; error?: string }> {
  const name = domainName.toLowerCase().replace(/^www\./, "");
  if (!isResendDomainsConfigured()) {
    return {
      domain: null,
      created: false,
      error: "RESEND_API_KEY not configured",
    };
  }

  const listed = await listResendDomains();
  const existing = listed.find((d) => d.name === name);
  if (existing?.id) {
    const full = (await getResendDomain(existing.id)) ?? existing;
    return { domain: full, created: false };
  }

  const created = await createResendDomain(name);
  if (created.domain?.id) {
    const full =
      (await getResendDomain(created.domain.id)) ?? created.domain;
    return { domain: full, created: true };
  }

  // Race: another create may have succeeded
  const again = await listResendDomains();
  const found = again.find((d) => d.name === name);
  if (found?.id) {
    const full = (await getResendDomain(found.id)) ?? found;
    return { domain: full, created: false };
  }

  return {
    domain: null,
    created: false,
    error: created.error || "Could not create or find domain at Resend",
  };
}

export async function verifyResendDomain(
  domainId: string,
): Promise<{ ok: boolean; domain: ResendDomain | null; error?: string }> {
  const { ok, status, json } = await resendFetch(
    `/domains/${encodeURIComponent(domainId)}/verify`,
    { method: "POST" },
  );
  if (!ok) {
    return {
      ok: false,
      domain: null,
      error:
        typeof json.message === "string"
          ? json.message
          : `Resend verify failed (HTTP ${status})`,
    };
  }
  const full = await getResendDomain(domainId);
  return { ok: true, domain: full ?? (json.id ? normalizeResendDomain(json) : null) };
}
