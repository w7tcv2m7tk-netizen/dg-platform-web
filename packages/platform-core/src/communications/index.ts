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
  metadata?: Record<string, unknown>;
}

export interface SendMessageResult {
  id: string;
  channel: CommsChannel;
  status: "queued" | "sent" | "failed";
  provider?: string;
}

/** Stub — logs intent until Twilio/email providers are connected. */
export async function sendMessage(
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const id = `msg_${Date.now()}`;
  console.info("[communications] sendMessage (stub)", {
    id,
    channel: input.channel,
    to: input.to,
    organisationId: input.organisationId,
  });
  return { id, channel: input.channel, status: "queued", provider: "stub" };
}

export async function communicationsHealthCheck(_organisationId: string) {
  return {
    ok: true,
    providers: { email: "stub", sms: "not_configured", voice: "not_configured" },
  };
}
