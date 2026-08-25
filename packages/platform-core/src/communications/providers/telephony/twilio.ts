import type {
  PlaceCallInput,
  PlaceCallResult,
  ProvisionNumberInput,
  ProvisionNumberResult,
  SendSmsInput,
  SendSmsResult,
  TelephonyProvider,
} from "./types";
import { isTwilioTelephonyConfigured } from "./types";

/**
 * Twilio — first production telephony adapter.
 * Implementation is intentional scaffold: interface + config gate only.
 * Full SMS/voice/number APIs ship when SMS/Calls channels go Live — do not
 * call Twilio from app UI; always go through Communication Service.
 */
export class TwilioTelephonyProvider implements TelephonyProvider {
  readonly id = "twilio" as const;

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    if (!isTwilioTelephonyConfigured()) {
      return {
        ok: false,
        provider: "twilio",
        status: "failed",
        error: "Twilio credentials not configured",
      };
    }
    // Live path: POST Messages API — deferred until SMS channel ships.
    console.info("[telephony:twilio] sendSms queued (adapter Live path pending)", {
      organisationId: input.organisationId,
      to: input.to,
    });
    return {
      ok: true,
      provider: "twilio",
      providerMessageId: `twilio_pending_${Date.now()}`,
      status: "queued",
    };
  }

  async placeCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    if (!isTwilioTelephonyConfigured()) {
      return {
        ok: false,
        provider: "twilio",
        status: "failed",
        error: "Twilio credentials not configured",
      };
    }
    console.info("[telephony:twilio] placeCall queued (adapter Live path pending)", {
      organisationId: input.organisationId,
      to: input.to,
    });
    return {
      ok: true,
      provider: "twilio",
      providerCallId: `twilio_pending_${Date.now()}`,
      status: "queued",
    };
  }

  async provisionNumber(_input: ProvisionNumberInput): Promise<ProvisionNumberResult> {
    if (!isTwilioTelephonyConfigured()) {
      return {
        ok: false,
        provider: "twilio",
        error: "Twilio credentials not configured",
      };
    }
    return {
      ok: false,
      provider: "twilio",
      error: "Number provisioning Live path pending",
    };
  }

  async health() {
    const connected = isTwilioTelephonyConfigured();
    return {
      connected,
      detail: connected
        ? "Twilio credentials present — SMS/voice Live path pending"
        : "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set",
    };
  }
}
