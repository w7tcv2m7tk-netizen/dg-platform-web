/**
 * Deliverability helpers — SPF / DKIM / DMARC / MX suggestions.
 * Does not probe live DNS yet; produces checklist + records for Domains DNS apply.
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */

import type { EmailAuthCheckItem, EmailDomainIdentity } from "./types";

const RESEND_SPF_INCLUDE = "include:_spf.resend.com";
const DEFAULT_DMARC =
  process.env.DG_EMAIL_DMARC_POLICY?.trim() ||
  "v=DMARC1; p=none; rua=mailto:dmarc@digitalgate.com.au";

/**
 * Suggested auth DNS for a customer sending domain.
 * DKIM host/value come from the ESP after domain create (Resend dashboard/API) —
 * we only reserve the checklist slot until E1 verifyDomain lands.
 */
export function suggestEmailAuthDns(domain: string): EmailAuthCheckItem[] {
  const apex = domain.toLowerCase().replace(/\.$/, "");
  const spfInclude =
    process.env.DG_EMAIL_SPF_INCLUDE?.trim() || RESEND_SPF_INCLUDE;

  return [
    {
      id: "SPF",
      label: "SPF",
      state: "missing",
      detail: "Authorise transactional ESP to send for this domain",
      suggestedRecord: {
        type: "TXT",
        name: "@",
        content: `v=spf1 ${spfInclude} ~all`,
        purpose: `SPF for ${apex}`,
      },
    },
    {
      id: "DKIM",
      label: "DKIM",
      state: "pending",
      detail:
        "Add DKIM CNAMEs/TXT from the ESP after domain verify (Resend → Domains)",
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
        "Only required for business mailbox / inbound — provisioned with Dreamscape email hosting later",
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
