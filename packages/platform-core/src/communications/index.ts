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
  /** Optional CC recipients (Resend). Duplicates of `to` are dropped. */
  cc?: string | string[];
  subject?: string;
  body: string;
  /** Pre-built HTML body; when omitted for email, plain `body` is wrapped with org branding. */
  bodyHtml?: string;
  metadata?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
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
  parseMailbox,
  brandReplyTo,
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
          from:
            typeof input.metadata?.from === "string"
              ? input.metadata.from
              : undefined,
          replyTo:
            typeof input.metadata?.replyTo === "string"
              ? input.metadata.replyTo
              : undefined,
          fromMode:
            typeof input.metadata?.fromMode === "string"
              ? input.metadata.fromMode
              : undefined,
        },
      },
    });
  } catch (err) {
    console.warn("[communications] failed to persist outbound email activity", err);
  }
}

function normalizeCc(to: string, cc?: string | string[]): string[] {
  const toKey = to.trim().toLowerCase();
  const raw = Array.isArray(cc) ? cc : cc ? [cc] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const email = item.trim();
    const key = email.toLowerCase();
    if (!email.includes("@") || key === toKey || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

async function tryResendDelivery(input: {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string | null;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  try {
    const payload: Record<string, unknown> = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    };
    if (input.cc?.length) payload.cc = input.cc;
    const replyTo = input.replyTo?.trim();
    if (replyTo) payload.reply_to = replyTo;
    if (input.attachments?.length) {
      payload.attachments = input.attachments.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.content, "utf8").toString("base64"),
        content_type: file.contentType || "application/octet-stream",
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

function mailboxKey(from: string): string {
  const raw = from.trim();
  const angled = raw.match(/<([^>\s]+@[^>\s]+)>/);
  return (angled?.[1] || raw).trim().toLowerCase();
}

/** Only verified Resend send domain on current account (see diagnose-resend-domains.mjs). */
const VERIFIED_RESEND_SEND_DOMAIN = "mail.digitalgate.com.au";

/**
 * Normalise legacy apex From addresses to the verified Resend subdomain.
 * hello@digitalgate.com.au → hello@mail.digitalgate.com.au
 */
function normaliseResendFromAddress(from: string): string {
  const trimmed = from.trim();
  if (!trimmed) return trimmed;
  const mailbox = mailboxKey(trimmed);
  if (!mailbox.endsWith("@digitalgate.com.au")) return trimmed;
  if (mailbox.endsWith(`@${VERIFIED_RESEND_SEND_DOMAIN}`)) return trimmed;
  const local = mailbox.split("@")[0] || "hello";
  const normalised = `${local}@${VERIFIED_RESEND_SEND_DOMAIN}`;
  const display = trimmed.match(/^([^<]+)</)?.[1]?.trim() || "DigitalGate";
  return `${display} <${normalised}>`;
}

function defaultFromAddress() {
  const raw =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "DigitalGate <hello@mail.digitalgate.com.au>";
  return normaliseResendFromAddress(raw);
}

function resolveSendFrom(input: {
  brandMode?: "org" | "platform";
  brandFrom?: string;
  metadataFrom?: unknown;
}): string {
  if (typeof input.metadataFrom === "string" && input.metadataFrom.trim()) {
    return normaliseResendFromAddress(input.metadataFrom.trim());
  }
  if (input.brandMode === "platform") {
    return "DigitalGate <hello@mail.digitalgate.com.au>";
  }
  if (input.brandFrom?.trim()) {
    return normaliseResendFromAddress(input.brandFrom.trim());
  }
  return defaultFromAddress();
}

/** Resend errors that usually mean From domain is not verified on this account. */
function isResendDomainFromError(error: string): boolean {
  return /domain|not verified|unverified|invalid.*from|from.*address|own a domain|verify.*domain/i.test(
    error,
  );
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
  let brandReplyToAddress: string | undefined;
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
    brandReplyToAddress = brand.replyTo;
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

  const { brandReplyTo: resolveReplyTo } = await import("./email-brand");
  const replyTo =
    (typeof input.metadata?.replyTo === "string" &&
      input.metadata.replyTo.trim()) ||
    brandReplyToAddress ||
    resolveReplyTo(from) ||
    resolveReplyTo(fromAddress || "") ||
    "hello@digitalgate.com.au";

  const cc = normalizeCc(input.to, input.cc);

  if (process.env.RESEND_API_KEY?.trim()) {
    let delivered = await tryResendDelivery({
      to: input.to,
      cc,
      subject,
      html,
      text: input.body,
      from,
      replyTo,
      attachments: input.attachments,
    });
    let usedFrom = from;
    let fromMode: "brand" | "platform_fallback" = "brand";

    const platformFrom = defaultFromAddress();
    if (
      !delivered.ok &&
      isResendDomainFromError(delivered.error) &&
      mailboxKey(from) !== mailboxKey(platformFrom)
    ) {
      console.warn("[communications] Resend domain/from failed — retry platform From", {
        error: delivered.error,
        from,
        platformFrom,
        replyTo,
      });
      delivered = await tryResendDelivery({
        to: input.to,
        cc,
        subject,
        html,
        text: input.body,
        from: platformFrom,
        replyTo,
        attachments: input.attachments,
      });
      usedFrom = platformFrom;
      fromMode = "platform_fallback";
    }

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
        metadata: {
          ...input.metadata,
          from: usedFrom,
          replyTo,
          fromMode,
          ...(cc.length ? { cc } : {}),
        },
        messageId: result.id,
        provider: "resend",
        status: "sent",
      });
      console.info("[communications] sendMessage (resend)", {
        id: result.id,
        to: input.to,
        cc: cc.length ? cc : undefined,
        from: usedFrom,
        replyTo,
        fromMode,
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
      metadata: {
        ...input.metadata,
        from,
        replyTo,
        fromMode: "brand",
      },
      messageId: id,
      provider: "resend",
      status: "failed",
      error: delivered.error,
    });
    console.warn("[communications] Resend failed — queued branded email", {
      id,
      error: delivered.error,
      from,
      replyTo,
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
