/**
 * Transactional email provider — Resend adapter (orchestration only).
 * App-facing send remains communications.sendMessage; this is the Infra plane.
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */

import type {
  TransactionalSendInput,
  TransactionalSendResult,
} from "./types";

export interface TransactionalEmailProvider {
  readonly id: string;
  readonly kind: "transactional";
  isConfigured(): boolean;
  defaultFrom(): string | null;
  send(input: TransactionalSendInput): Promise<TransactionalSendResult>;
}

export class ResendTransactionalProvider implements TransactionalEmailProvider {
  readonly id = "resend";
  readonly kind = "transactional" as const;

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }

  defaultFrom(): string | null {
    return (
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      null
    );
  }

  async send(input: TransactionalSendInput): Promise<TransactionalSendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return {
        id: `queued_${Date.now()}`,
        status: "queued",
        provider: "stub_queue",
        error: "RESEND_API_KEY not configured",
      };
    }

    const from =
      input.from?.trim() ||
      this.defaultFrom() ||
      "DigitalGate <onboarding@resend.dev>";

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
          reply_to: input.replyTo,
          tags: input.tags?.map((t) => ({ name: t, value: "true" })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!res.ok) {
        return {
          id: `fail_${Date.now()}`,
          status: "failed",
          provider: this.id,
          error: json.message || `Resend HTTP ${res.status}`,
        };
      }
      return {
        id: json.id || `resend_${Date.now()}`,
        status: "sent",
        provider: this.id,
      };
    } catch (err) {
      return {
        id: `fail_${Date.now()}`,
        status: "failed",
        provider: this.id,
        error: err instanceof Error ? err.message : "Resend request failed",
      };
    }
  }
}

export function getTransactionalEmailProvider(): TransactionalEmailProvider {
  return new ResendTransactionalProvider();
}
