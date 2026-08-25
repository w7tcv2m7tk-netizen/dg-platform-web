import type {
  PlaceCallInput,
  PlaceCallResult,
  ProvisionNumberInput,
  ProvisionNumberResult,
  SendSmsInput,
  SendSmsResult,
  TelephonyProvider,
} from "./types";

/** Local / unconfigured fallback — never treat as production carrier. */
export class StubTelephonyProvider implements TelephonyProvider {
  readonly id = "stub" as const;

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    console.info("[telephony:stub] sendSms", {
      organisationId: input.organisationId,
      to: input.to,
    });
    return {
      ok: true,
      provider: "stub",
      providerMessageId: `stub_sms_${Date.now()}`,
      status: "queued",
    };
  }

  async placeCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    console.info("[telephony:stub] placeCall", {
      organisationId: input.organisationId,
      to: input.to,
    });
    return {
      ok: true,
      provider: "stub",
      providerCallId: `stub_call_${Date.now()}`,
      status: "queued",
    };
  }

  async provisionNumber(_input: ProvisionNumberInput): Promise<ProvisionNumberResult> {
    return {
      ok: false,
      provider: "stub",
      error: "Telephony not configured — connect a business phone under Connected Services",
    };
  }

  async health() {
    return { connected: false, detail: "No telephony provider configured" };
  }
}
