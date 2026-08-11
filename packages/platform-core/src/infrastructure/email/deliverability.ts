/**
 * Deliverability helpers — SPF / DKIM / DMARC / MX suggestions + Resend-backed plans.
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */

import type { DnsRecord } from "../core/types";
import {
  ensureResendDomain,
  isResendDomainsConfigured,
  resendRecordsToDnsRecords,
  type ResendDomain,
  verifyResendDomain,
} from "./resend-domains";
import type {
  EmailAuthCheckItem,
  EmailAuthCheckState,
  EmailDomainIdentity,
  EmailDomainVerificationStatus,
} from "./types";

const DEFAULT_DMARC =
  process.env.DG_EMAIL_DMARC_POLICY?.trim() ||
  "v=DMARC1; p=none; rua=mailto:dmarc@digitalgate.com.au";

function mapResendRecordStatus(status?: string): EmailAuthCheckState {
  const s = (status ?? "").toLowerCase();
  if (s === "verified" || s === "valid") return "pass";
  if (s === "pending" || s === "temporary_failure" || s === "not_started") {
    return "pending";
  }
  if (s === "failed") return "fail";
  return "missing";
}

function domainStatusFromResend(
  status: string,
): EmailDomainVerificationStatus {
  const s = status.toLowerCase();
  if (s === "verified") return "verified";
  if (s === "failed") return "failed";
  if (s === "pending" || s === "temporary_failure" || s === "not_started") {
    return "pending";
  }
  return "unverified";
}

/**
 * Suggested auth DNS when Resend domain is not yet prepared (fallback only).
 * Prefer Resend’s returned records after prepare.
 */
export function suggestEmailAuthDns(domain: string): EmailAuthCheckItem[] {
  const apex = domain.toLowerCase().replace(/\.$/, "");

  return [
    {
      id: "SPF",
      label: "SPF",
      state: "missing",
      detail:
        "Prepare the sending domain to load ESP SPF records (usually on the send subdomain)",
      suggestedRecord: {
        type: "TXT",
        name: "send",
        content: "v=spf1 include:amazonses.com ~all",
        purpose: `SPF (send) for ${apex}`,
      },
    },
    {
      id: "DKIM",
      label: "DKIM",
      state: "pending",
      detail: "DKIM hosts come from the ESP after Prepare sending domain",
    },
    {
      id: "DMARC",
      label: "DMARC",
      state: "missing",
      detail: "Start with p=none; tighten after SPF/DKIM pass",
      suggestedRecord: {
        type: "TXT",
        name: "_dmarc",
        content: DEFAULT_DMARC,
        purpose: `DMARC for ${apex}`,
      },
    },
    {
      id: "MX",
      label: "MX (mailbox)",
      state: "skipped",
      detail:
        "Apex mailbox MX is separate — Resend uses send-subdomain MX for return-path only",
    },
  ];
}

export function emptyEmailDomainIdentity(
  domain: string,
  organisationId?: string,
): EmailDomainIdentity {
  const checks = suggestEmailAuthDns(domain);
  const byId = Object.fromEntries(checks.map((c) => [c.id, c.state]));
  return {
    domain: domain.toLowerCase(),
    organisationId,
    status: "unverified",
    spf: byId.SPF ?? "unknown",
    dkim: byId.DKIM ?? "unknown",
    dmarc: byId.DMARC ?? "unknown",
    mx: byId.MX ?? "skipped",
    checks,
    transactionalProviderId: process.env.RESEND_API_KEY?.trim()
      ? "resend"
      : null,
    mailboxProviderId: null,
  };
}

export type EmailDomainAuthPlan = {
  identity: EmailDomainIdentity;
  suggestedDns: Array<{
    type: string;
    name: string;
    content: string;
    purpose: string;
    priority?: number;
  }>;
  resendDomainId: string | null;
  resendStatus: string | null;
  created: boolean;
  note?: string;
};

function buildChecksFromResend(
  domain: ResendDomain,
  apex: string,
): EmailAuthCheckItem[] {
  const byPurpose = (purpose: string) =>
    domain.records.filter(
      (r) => (r.record ?? "").toUpperCase() === purpose.toUpperCase(),
    );

  const spfRecs = byPurpose("SPF");
  const dkimRecs = byPurpose("DKIM");
  const trackingRecs = byPurpose("Tracking");
  const domainVerified =
    domain.status.toLowerCase() === "verified" ||
    domain.status.toLowerCase() === "valid";

  const worst = (states: EmailAuthCheckState[]): EmailAuthCheckState => {
    if (states.includes("fail")) return "fail";
    if (states.includes("missing")) return "missing";
    if (states.includes("pending")) return "pending";
    if (states.length && states.every((s) => s === "pass")) return "pass";
    return "unknown";
  };

  // Resend can report domain.status=verified while per-record status lags as
  // pending/empty — trust the domain when verified so Gen 2 matches the ESP UI.
  const spfState = domainVerified
    ? "pass"
    : spfRecs.length
      ? worst(spfRecs.map((r) => mapResendRecordStatus(r.status)))
      : "missing";
  const dkimState = domainVerified
    ? "pass"
    : dkimRecs.length
      ? worst(dkimRecs.map((r) => mapResendRecordStatus(r.status)))
      : "missing";
  const dmarcState = domainVerified ? "pass" : "missing";

  const checks: EmailAuthCheckItem[] = [
    {
      id: "SPF",
      label: "SPF",
      state: spfState,
      detail: domainVerified
        ? "ESP domain verified — sending SPF OK"
        : spfRecs.length
          ? `${spfRecs.length} ESP SPF record(s) on send path`
          : "No SPF records from ESP yet — run Prepare",
    },
    {
      id: "DKIM",
      label: "DKIM",
      state: dkimState,
      detail: domainVerified
        ? "ESP domain verified — DKIM OK"
        : dkimRecs.length
          ? `${dkimRecs.length} DKIM record(s)`
          : "No DKIM records from ESP yet — run Prepare",
    },
    {
      id: "DMARC",
      label: "DMARC",
      state: dmarcState,
      detail: domainVerified
        ? "Optional DMARC — publish p=none (or tighter) at _dmarc"
        : "Platform suggests p=none until SPF/DKIM pass",
      suggestedRecord: {
        type: "TXT",
        name: "_dmarc",
        content: DEFAULT_DMARC,
        purpose: `DMARC for ${apex}`,
      },
    },
    {
      id: "MX",
      label: "MX (mailbox)",
      state: "skipped",
      detail: "Apex mailbox MX unchanged — ESP return-path uses send subdomain",
    },
  ];

  if (trackingRecs.length) {
    checks.push({
      id: "Tracking",
      label: "Click tracking",
      state: domainVerified
        ? "pass"
        : worst(trackingRecs.map((r) => mapResendRecordStatus(r.status))),
      detail: "Optional ESP click-tracking CNAME",
    });
  }

  return checks;
}

function suggestedDnsFromPlan(
  domain: ResendDomain | null,
  apex: string,
): EmailDomainAuthPlan["suggestedDns"] {
  const out: EmailDomainAuthPlan["suggestedDns"] = [];
  if (domain) {
    for (const r of resendRecordsToDnsRecords(domain, apex)) {
      out.push({
        type: r.type,
        name: r.name,
        content: r.content,
        purpose: `${r.type} ${r.name} (ESP auth)`,
        priority: r.priority,
      });
    }
  } else {
    for (const c of suggestEmailAuthDns(apex)) {
      if (c.suggestedRecord) out.push(c.suggestedRecord);
    }
  }
  if (!out.some((r) => r.name === "_dmarc" && r.type.toUpperCase() === "TXT")) {
    out.push({
      type: "TXT",
      name: "_dmarc",
      content: DEFAULT_DMARC,
      purpose: `DMARC for ${apex}`,
    });
  }
  return out;
}

/** Build auth checklist — ensures Resend domain when configured. */
export async function buildEmailDomainAuthPlan(input: {
  domain: string;
  organisationId?: string;
  /** When false, only look up existing Resend domain (no create). */
  ensure?: boolean;
}): Promise<EmailDomainAuthPlan> {
  const apex = input.domain.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

  if (!isResendDomainsConfigured()) {
    const identity = emptyEmailDomainIdentity(apex, input.organisationId);
    return {
      identity,
      suggestedDns: suggestedDnsFromPlan(null, apex),
      resendDomainId: null,
      resendStatus: null,
      created: false,
      note: "Set RESEND_API_KEY to prepare a sending domain automatically",
    };
  }

  if (input.ensure === false) {
    const { listResendDomains, getResendDomain } = await import("./resend-domains");
    const listed = await listResendDomains();
    const hit = listed.find((d) => d.name === apex);
    const domain = hit?.id ? (await getResendDomain(hit.id)) ?? hit : null;
    if (!domain) {
      const identity = emptyEmailDomainIdentity(apex, input.organisationId);
      return {
        identity,
        suggestedDns: suggestedDnsFromPlan(null, apex),
        resendDomainId: null,
        resendStatus: null,
        created: false,
        note: "Sending domain not prepared yet — click Prepare",
      };
    }
    const checks = buildChecksFromResend(domain, apex);
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.state]));
    return {
      identity: {
        domain: apex,
        organisationId: input.organisationId,
        status: domainStatusFromResend(domain.status),
        spf: byId.SPF ?? "unknown",
        dkim: byId.DKIM ?? "unknown",
        dmarc: byId.DMARC ?? "unknown",
        mx: byId.MX ?? "skipped",
        checks,
        transactionalProviderId: "resend",
        mailboxProviderId: null,
      },
      suggestedDns: suggestedDnsFromPlan(domain, apex),
      resendDomainId: domain.id,
      resendStatus: domain.status,
      created: false,
    };
  }

  const ensured = await ensureResendDomain(apex);
  if (!ensured.domain) {
    const identity = emptyEmailDomainIdentity(apex, input.organisationId);
    return {
      identity,
      suggestedDns: suggestedDnsFromPlan(null, apex),
      resendDomainId: null,
      resendStatus: null,
      created: false,
      note: ensured.error || "Could not prepare sending domain",
    };
  }

  const domain = ensured.domain;
  const checks = buildChecksFromResend(domain, apex);
  const byId = Object.fromEntries(checks.map((c) => [c.id, c.state]));
  return {
    identity: {
      domain: apex,
      organisationId: input.organisationId,
      status: domainStatusFromResend(domain.status),
      spf: byId.SPF ?? "unknown",
      dkim: byId.DKIM ?? "unknown",
      dmarc: byId.DMARC ?? "unknown",
      mx: byId.MX ?? "skipped",
      checks,
      transactionalProviderId: "resend",
      mailboxProviderId: null,
    },
    suggestedDns: suggestedDnsFromPlan(domain, apex),
    resendDomainId: domain.id,
    resendStatus: domain.status,
    created: ensured.created,
    note: ensured.created
      ? "Sending domain created — apply auth DNS next"
      : undefined,
  };
}

export type ApplyEmailAuthDnsResult = {
  records: DnsRecord[];
  plan: EmailDomainAuthPlan;
  verify?: { ok: boolean; status?: string | null; error?: string };
};

/** Apply ESP + DMARC auth records via Domains DNS provider, then optionally verify. */
export async function applyEmailAuthDns(input: {
  domain: string;
  organisationId?: string;
  verifyAfter?: boolean;
}): Promise<ApplyEmailAuthDnsResult> {
  const plan = await buildEmailDomainAuthPlan({
    domain: input.domain,
    organisationId: input.organisationId,
    ensure: true,
  });

  const records: DnsRecord[] = plan.suggestedDns.map((r) => ({
    type: r.type,
    name: r.name,
    content: r.content,
    priority: r.priority,
  }));

  if (records.length === 0) {
    throw new Error("No auth DNS records to apply — prepare the sending domain first");
  }

  const { requireDnsProvider } = await import("../dns");
  const applied = await requireDnsProvider().upsertRecords(
    plan.identity.domain,
    records,
  );

  let verify: ApplyEmailAuthDnsResult["verify"];
  if (input.verifyAfter !== false && plan.resendDomainId) {
    const result = await verifyResendDomain(plan.resendDomainId);
    verify = {
      ok: result.ok,
      status: result.domain?.status ?? null,
      error: result.error,
    };
  }

  const refreshed = await buildEmailDomainAuthPlan({
    domain: plan.identity.domain,
    organisationId: input.organisationId,
    ensure: false,
  });

  return {
    records: applied,
    plan: refreshed.resendDomainId ? refreshed : plan,
    verify,
  };
}

export async function triggerEmailDomainVerify(input: {
  domain: string;
  organisationId?: string;
}): Promise<{
  ok: boolean;
  plan: EmailDomainAuthPlan;
  error?: string;
}> {
  const plan = await buildEmailDomainAuthPlan({
    domain: input.domain,
    organisationId: input.organisationId,
    ensure: true,
  });
  if (!plan.resendDomainId) {
    return {
      ok: false,
      plan,
      error: plan.note || "Sending domain not prepared",
    };
  }
  const result = await verifyResendDomain(plan.resendDomainId);
  // Prefer the fresh GET from verify — list/ensure can lag behind Resend UI.
  const refreshed = result.domain
    ? (() => {
        const checks = buildChecksFromResend(result.domain!, input.domain);
        const byId = Object.fromEntries(checks.map((c) => [c.id, c.state]));
        const apex = input.domain
          .toLowerCase()
          .replace(/^www\./, "")
          .replace(/\.$/, "");
        return {
          identity: {
            domain: apex,
            organisationId: input.organisationId,
            status: domainStatusFromResend(result.domain!.status),
            spf: byId.SPF ?? "unknown",
            dkim: byId.DKIM ?? "unknown",
            dmarc: byId.DMARC ?? "unknown",
            mx: byId.MX ?? "skipped",
            checks,
            transactionalProviderId: "resend" as const,
            mailboxProviderId: null,
          },
          suggestedDns: suggestedDnsFromPlan(result.domain, apex),
          resendDomainId: result.domain.id,
          resendStatus: result.domain.status,
          created: false,
        } satisfies EmailDomainAuthPlan;
      })()
    : await buildEmailDomainAuthPlan({
        domain: input.domain,
        organisationId: input.organisationId,
        ensure: false,
      });
  return {
    ok: result.ok || refreshed.resendStatus?.toLowerCase() === "verified",
    plan: refreshed,
    error: result.error,
  };
}
