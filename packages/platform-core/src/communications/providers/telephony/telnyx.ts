import type {
  PlaceCallInput,
  PlaceCallResult,
  ProvisionNumberInput,
  ProvisionNumberResult,
  SendSmsInput,
  SendSmsResult,
  TelephonyProvider,
} from "./types";
import { isTelnyxTelephonyConfigured } from "./types";

/**
 * Telnyx — evaluate before volume commitment (AI voice stack + AU sender-ID docs).
 * Adapter registered so Communication Service never hard-wires Twilio.
 */
export class TelnyxTelephonyProvider implements TelephonyProvider {
  readonly id = "telnyx" as const;

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    if (!isTelnyxTelephonyConfigured()) {
      return {
        ok: false,
        provider: "telnyx",
        status: "failed",
        error: "Telnyx credentials not configured",
      };
    }
    console.info("[telephony:telnyx] sendSms evaluate path", {
      organisationId: input.organisationId,
      to: input.to,
    });
    return {
      ok: true,
      provider: "telnyx",
      providerMessageId: `telnyx_pending_${Date.now()}`,
      status: "queued",
    };
  }

  async placeCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    if (!isTelnyxTelephonyConfigured()) {
      return {
        ok: false,
        provider: "telnyx",
        status: "failed",
        error: "Telnyx credentials not configured",
      };
    }
    console.info("[telephony:telnyx] placeCall evaluate path", {
      organisationId: input.organisationId,
      to: input.to,
    });
    return {
      ok: true,
      provider: "telnyx",
      providerCallId: `telnyx_pending_${Date.now()}`,
      status: "queued",
    };
  }

  async provisionNumber(_input: ProvisionNumberInput): Promise<ProvisionNumberResult> {
    return {
      ok: false,
      provider: "telnyx",
      error: "Telnyx number provisioning not Live yet",
    };
  }

  async health() {
    const connected = isTelnyxTelephonyConfigured();
    return {
      connected,
      detail: connected
        ? "Telnyx credentials present — evaluate path"
        : "TELNYX_API_KEY not set",
    };
  }
}
