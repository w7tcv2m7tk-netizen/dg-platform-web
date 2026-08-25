/**
 * Telephony / messaging provider adapters (SMS · programmable voice · numbers).
 *
 * DigitalGate owns Communication records; adapters own carrier plumbing.
 * Twilio = first Live-path implementation. Telnyx = evaluate before scale.
 * Customers never see provider names — Connected Services says “business phone / SMS”.
 *
 * @see docs/foundations/COMMUNICATIONS.md — Provider-agnostic telephony lock
 */

export const TELEPHONY_PROVIDER_IDS = ["twilio", "telnyx", "stub"] as const;
export type TelephonyProviderId = (typeof TELEPHONY_PROVIDER_IDS)[number];

export const TELEPHONY_PROVIDER_OPTIONS = [
  {
    id: "twilio" as const,
    label: "Twilio",
    status: "first" as const,
    description:
      "First production telephony adapter — SMS + programmable voice + numbers. Mature AU pricing.",
  },
  {
    id: "telnyx" as const,
    label: "Telnyx",
    status: "evaluate" as const,
    description:
      "Evaluate before volume commitment — voice/SMS/numbers + AI voice stack; AU sender-ID (ACMA) docs.",
  },
] as const;

export type SendSmsInput = {
  organisationId: string;
  to: string;
  body: string;
  from?: string;
  /** Persist against Core Communication / Contact when known */
  contactId?: string;
  metadata?: Record<string, unknown>;
};

export type SendSmsResult = {
  ok: boolean;
  provider: TelephonyProviderId;
  providerMessageId?: string;
  status: "queued" | "sent" | "failed";
  error?: string;
};

export type PlaceCallInput = {
  organisationId: string;
  to: string;
  from?: string;
  /** Provider-specific webhook / TwiML / TeXML URL when Live */
  answerUrl?: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
};

export type PlaceCallResult = {
  ok: boolean;
  provider: TelephonyProviderId;
  providerCallId?: string;
  status: "queued" | "ringing" | "failed";
  error?: string;
};

export type ProvisionNumberInput = {
  organisationId: string;
  country?: string;
  areaCode?: string;
  capabilities?: Array<"sms" | "voice" | "mms">;
};

export type ProvisionNumberResult = {
  ok: boolean;
  provider: TelephonyProviderId;
  phoneNumber?: string;
  providerNumberId?: string;
  error?: string;
};

/**
 * Carrier / CPaaS adapter — not the Communication Service itself.
 * Orchestrator + OrgCommunication + Timeline stay DigitalGate-owned.
 */
export interface TelephonyProvider {
  readonly id: TelephonyProviderId;
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  placeCall(input: PlaceCallInput): Promise<PlaceCallResult>;
  provisionNumber?(input: ProvisionNumberInput): Promise<ProvisionNumberResult>;
  health(): Promise<{ connected: boolean; detail?: string }>;
}

export function isTwilioTelephonyConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}

export function isTelnyxTelephonyConfigured(): boolean {
  return Boolean(process.env.TELNYX_API_KEY?.trim());
}
