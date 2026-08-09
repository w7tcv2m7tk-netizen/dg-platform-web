/**
 * DigitalGate Email Infrastructure — Core Platform Service.
 *
 * Orchestrates transactional send (Resend), business mailboxes (Dreamscape stub),
 * and deliverability DNS suggestions. Does not run a mail server.
 *
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */

import { emptyEmailDomainIdentity, suggestEmailAuthDns } from "./deliverability";
import { getBusinessMailboxProvider } from "./mailbox";
import { getTransactionalEmailProvider } from "./transactional";
import type { EmailInfrastructureOverview } from "./types";

export * from "./types";
export * from "./deliverability";
export * from "./transactional";
export * from "./mailbox";

/** @deprecated Prefer getBusinessMailboxProvider */
export function getBusinessEmailProvider() {
  return getBusinessMailboxProvider();
}

export async function getEmailInfrastructureOverview(
  _organisationId?: string,
): Promise<EmailInfrastructureOverview> {
  const tx = getTransactionalEmailProvider();
  const mailbox = getBusinessMailboxProvider();
  const from = tx.defaultFrom();
  const txOk = tx.isConfigured();
  const mbOk = Boolean(mailbox?.isConfigured());

  const nextSteps: string[] = [];
  if (!txOk) {
    nextSteps.push(
      "Set RESEND_API_KEY (+ RESEND_FROM_EMAIL) for transactional send",
    );
  } else {
    nextSteps.push(
      "Verify a customer domain in Resend, then apply SPF/DKIM/DMARC via Domains DNS",
    );
  }
  if (!mbOk) {
    nextSteps.push(
      "Dreamscape credentials enable future mailbox provisioning (not shipped)",
    );
  } else {
    nextSteps.push(
      "Business mailbox provision is stubbed — use Dreamscape console until E3",
    );
  }
  nextSteps.push("See docs/foundations/EMAIL-INFRASTRUCTURE.md");

  return {
    checkedAt: new Date().toISOString(),
    platform: {
      configured: txOk,
      providerId: txOk ? tx.id : null,
      fromAddress: from,
      message: txOk
        ? `Transactional provider ready${from ? ` · from ${from}` : ""}`
        : "Platform transactional email not configured (RESEND_API_KEY)",
    },
    tenantTransactional: {
      configured: txOk,
      providerId: txOk ? tx.id : null,
      message: txOk
        ? "V1 shares Resend with platform — separate tenant keys/streams later"
        : "Tenant send unavailable until Resend is configured",
    },
    mailbox: {
      configured: mbOk,
      providerId: mailbox?.id ?? null,
      message: mbOk
        ? "Dreamscape connected — mailbox list/provision not implemented yet"
        : "Business mailbox provider not configured",
    },
    nextSteps,
    docsPath: "docs/foundations/EMAIL-INFRASTRUCTURE.md",
  };
}

/** Build auth checklist for a domain (no live DNS probe yet). */
export function getEmailDomainAuthPlan(domain: string, organisationId?: string) {
  return {
    identity: emptyEmailDomainIdentity(domain, organisationId),
    suggestedDns: suggestEmailAuthDns(domain)
      .map((c) => c.suggestedRecord)
      .filter(Boolean),
  };
}
