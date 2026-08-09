/**
 * DigitalGate Email Infrastructure — types.
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */

export type EmailAuthRecordType = "SPF" | "DKIM" | "DMARC" | "MX";

export type EmailAuthCheckState =
  | "pass"
  | "pending"
  | "missing"
  | "fail"
  | "unknown"
  | "skipped";

export type EmailAuthCheckItem = {
  id: EmailAuthRecordType | string;
  label: string;
  state: EmailAuthCheckState;
  detail?: string;
  /** Suggested DNS record when missing */
  suggestedRecord?: {
    type: string;
    name: string;
    content: string;
    purpose: string;
  };
};

export type EmailDomainVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "failed"
  | "unknown";

export type EmailDomainIdentity = {
  domain: string;
  organisationId?: string;
  status: EmailDomainVerificationStatus;
  spf: EmailAuthCheckState;
  dkim: EmailAuthCheckState;
  dmarc: EmailAuthCheckState;
  mx: EmailAuthCheckState;
  checks: EmailAuthCheckItem[];
  transactionalProviderId: string | null;
  mailboxProviderId: string | null;
};

export type TransactionalSendInput = {
  organisationId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type TransactionalSendResult = {
  id: string;
  status: "queued" | "sent" | "failed";
  provider: string;
  error?: string;
};

export type EmailInfrastructureOverview = {
  checkedAt: string;
  /** Platform (DigitalGate) transactional plane */
  platform: {
    configured: boolean;
    providerId: string | null;
    fromAddress: string | null;
    message: string;
  };
  /** Tenant transactional plane (same Resend key V1; separate later) */
  tenantTransactional: {
    configured: boolean;
    providerId: string | null;
    message: string;
  };
  /** Business mailbox plane */
  mailbox: {
    configured: boolean;
    providerId: string | null;
    message: string;
  };
  /** Suggested next steps for staff */
  nextSteps: string[];
  docsPath: string;
};
