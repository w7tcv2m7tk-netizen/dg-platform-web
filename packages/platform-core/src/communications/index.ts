/**
 * AI Communications module — Phase 0 scaffold.
 * Providers (Twilio, ElevenLabs, email) wired in later phases.
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
}

export {
  wrapTransactionalEmail,
  renderOrgTransactionalEmail,
  resolveEmailBrandAssets,
  plainTextToEmailHtml,
} from "./email-brand";
export type { EmailBrandAssets, WrapTransactionalEmailInput } from "./email-brand";

/** Stub — prepares branded HTML for email; providers connected in later phases. */
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

  if (input.channel === "email") {
    try {
      const { renderOrgTransactionalEmail, plainTextToEmailHtml } = await import(
        "./email-brand"
      );
      const bodyHtml =
        input.bodyHtml?.trim() || plainTextToEmailHtml(input.body);
      const { html, brand } = await renderOrgTransactionalEmail({
        organisationId: input.organisationId,
        bodyHtml,
        footerNote:
          typeof input.metadata?.footerNote === "string"
            ? input.metadata.footerNote
            : undefined,
      });
      console.info("[communications] sendMessage (stub, branded)", {
        id,
        channel: input.channel,
        to: input.to,
        organisationId: input.organisationId,
        logoUrl: brand.logoUrl,
        businessName: brand.businessName,
      });
      return {
        ...base,
        brandedHtml: html,
        logoUrl: brand.logoUrl,
        businessName: brand.businessName,
      };
    } catch (err) {
      console.warn("[communications] brand wrap failed; queuing plain body", err);
    }
  }

  console.info("[communications] sendMessage (stub)", {
    id,
    channel: input.channel,
    to: input.to,
    organisationId: input.organisationId,
  });
  return base;
}

export async function communicationsHealthCheck(_organisationId: string) {
  return {
    ok: true,
    providers: { email: "stub", sms: "not_configured", voice: "not_configured" },
  };
}
