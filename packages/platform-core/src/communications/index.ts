/**
 * AI Communications module — Phase 0 scaffold + optional Resend delivery.
 * SMS/voice providers wired in later phases.
 */

export type CommsChannel = "email" | "sms" | "voice" | "chat";

export interface SendMessageInput {
  organisationId: string;
  channel: CommsChannel;
  contactId?: string;
  to: string;
  subject?: string;
  body: string;
  /** Pre-built HTML body; when omitted for email, plain `body` is wrapped with org branding. */
  bodyHtml?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResult {
  id: string;
  channel: CommsChannel;
  status: "queued" | "sent" | "failed";
  provider?: string;
  /** Branded HTML ready for Resend/SendGrid when channel is email. */
  brandedHtml?: string;
  logoUrl?: string;
  businessName?: string;
  error?: string;
}

export {
  wrapTransactionalEmail,
  renderOrgTransactionalEmail,
  resolveEmailBrandAssets,
  resolvePlatformEmailBrandAssets,
  resolveBrandFromAddress,
  plainTextToEmailHtml,
  markdownToEmailHtml,
  composeEmailBody,
  emailButton,
  emailHeading,
  emailScoreCard,
  emailKeyValueRows,
} from "./email-brand";
export type {
  EmailBrandAssets,
  WrapTransactionalEmailInput,
  EmailBodyBlock,
} from "./email-brand";

async function persistQueuedEmail(input: {
  organisationId: string;
  to: string;
  subject?: string;
  body: string;
  brandedHtml?: string;
  metadata?: Record<string, unknown>;
  messageId: string;
  provider: string;
  status: "queued" | "sent" | "failed";
  error?: string;
}) {
  try {
    const { prisma } = await import("@dg/database");
    await prisma.activity.create({
      data: {
        organisationId: input.organisationId,
        entityType: "OutboundEmail",
        entityId: input.messageId,
        activityType:
          input.status === "sent"
            ? "email_sent"
            : input.status === "failed"
              ? "email_failed"
              : "email_queued",
        title:
          input.status === "sent"
            ? `Email sent to ${input.to}`
            : input.status === "failed"
              ? `Email failed → ${input.to}`
              : `Email queued → ${input.to}`,
        body: input.subject
          ? `${input.subject}\n\n${input.body.slice(0, 2000)}`
          : input.body.slice(0, 2000),
        sourceApp: "communications",
        metadata: {
          to: input.to,
          subject: input.subject,
          provider: input.provider,
          status: input.status,
          error: input.error,
          purpose:
            typeof input.metadata?.purpose === "string"
              ? input.metadata.purpose
              : undefined,
          referralId:
            typeof input.metadata?.referralId === "string"
              ? input.metadata.referralId
              : undefined,
          hasBrandedHtml: Boolean(input.brandedHtml),
          brandedHtmlPreview: input.brandedHtml?.slice(0, 500),
        },
      },
    });
  } catch (err) {
    console.warn("[communications] failed to persist outbound email activity", err);
  }
}

async function tryResendDelivery(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: json.message || json.name || `Resend HTTP ${res.status}`,
      };
    }
    return { ok: true, id: json.id || `resend_${Date.now()}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Resend request failed",
    };
  }
}

function defaultFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "DigitalGate <hello@digitalgate.com.au>"
  );
}

function resolveSendFrom(input: {
  brandMode?: "org" | "platform";
  brandFrom?: string;
  metadataFrom?: unknown;
}): string {
  if (typeof input.metadataFrom === "string" && input.metadataFrom.trim()) {
    return input.metadataFrom.trim();
  }
  if (input.brandMode === "platform") {
    return "DigitalGate <hello@digitalgate.com.au>";
  }
  if (input.brandFrom?.trim()) return input.brandFrom.trim();
  return defaultFromAddress();
}

/**
 * Send or queue a message. Email: Resend when RESEND_API_KEY is set;
 * otherwise branded HTML is prepared and queued as an Activity.
 */
export async function sendMessage(
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const id = `msg_${Date.now()}`;
  const base: SendMessageResult = {
    id,
    channel: input.channel,
    status: "queued",
    provider: "stub",
  };

  if (input.channel !== "email") {
    console.info("[communications] sendMessage (stub)", {
      id,
      channel: input.channel,
      to: input.to,
      organisationId: input.organisationId,
    });
    return base;
  }

  let brandedHtml: string | undefined;
  let logoUrl: string | undefined;
  let businessName: string | undefined;
  let fromAddress: string | undefined;
  const brandMode =
    input.metadata?.purpose === "platform_referral_invite"
      ? ("platform" as const)
      : undefined;

  try {
    const { renderOrgTransactionalEmail } = await import("./email-brand");
    const { html, brand } = await renderOrgTransactionalEmail({
      organisationId: input.organisationId,
      bodyHtml: input.bodyHtml?.trim() || undefined,
      bodyText: input.body,
      brandMode,
      footerNote:
        typeof input.metadata?.footerNote === "string"
          ? input.metadata.footerNote
          : undefined,
    });
    brandedHtml = html;
    logoUrl = brand.logoUrl;
    businessName = brand.businessName;
    fromAddress = brand.fromAddress;
  } catch (err) {
    console.warn("[communications] brand wrap failed; using plain body", err);
  }

  const subject = input.subject?.trim() || "Message from DigitalGate";
  const html = brandedHtml || `<pre>${input.body}</pre>`;
  const from = resolveSendFrom({
    brandMode,
    brandFrom: fromAddress,
    metadataFrom: input.metadata?.from,
  });

  if (process.env.RESEND_API_KEY?.trim()) {
    const delivered = await tryResendDelivery({
      to: input.to,
      subject,
      html,
      text: input.body,
      from,
    });
    if (delivered.ok) {
      const result: SendMessageResult = {
        id: delivered.id,
        channel: "email",
        status: "sent",
        provider: "resend",
        brandedHtml,
        logoUrl,
        businessName,
      };
      await persistQueuedEmail({
        organisationId: input.organisationId,
        to: input.to,
        subject,
        body: input.body,
        brandedHtml,
        metadata: { ...input.metadata, from },
        messageId: result.id,
        provider: "resend",
        status: "sent",
      });
      console.info("[communications] sendMessage (resend)", {
        id: result.id,
        to: input.to,
        from,
        organisationId: input.organisationId,
      });
      return result;
    }
    await persistQueuedEmail({
      organisationId: input.organisationId,
      to: input.to,
      subject,
      body: input.body,
      brandedHtml,
      metadata: input.metadata,
      messageId: id,
      provider: "resend",
      status: "failed",
      error: delivered.error,
    });
    console.warn("[communications] Resend failed — queued branded email", {
      id,
      error: delivered.error,
    });
    return {
      ...base,
      status: "queued",
      provider: "stub",
      brandedHtml,
      logoUrl,
      businessName,
      error: delivered.error,
    };
  }

  await persistQueuedEmail({
    organisationId: input.organisationId,
    to: input.to,
    subject,
    body: input.body,
    brandedHtml,
    metadata: input.metadata,
    messageId: id,
    provider: "stub",
    status: "queued",
  });

  console.info("[communications] sendMessage (queued stub, branded)", {
    id,
    channel: input.channel,
    to: input.to,
    organisationId: input.organisationId,
    logoUrl,
    businessName,
  });

  return {
    ...base,
    brandedHtml,
    logoUrl,
    businessName,
  };
}

export async function communicationsHealthCheck(_organisationId: string) {
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  return {
    ok: true,
    providers: {
      email: resend ? "resend" : "stub_queue",
      sms: "not_configured",
      voice: "not_configured",
    },
  };
}
