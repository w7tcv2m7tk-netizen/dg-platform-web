import { StubTelephonyProvider } from "./stub";
import { TelnyxTelephonyProvider } from "./telnyx";
import { TwilioTelephonyProvider } from "./twilio";
import type { TelephonyProvider, TelephonyProviderId } from "./types";
import {
  isTelnyxTelephonyConfigured,
  isTwilioTelephonyConfigured,
} from "./types";

const cache = new Map<string, TelephonyProvider>();

/**
 * Resolve telephony adapter for SMS / programmable voice / numbers.
 * Default preference: Twilio (first) → Telnyx if only Telnyx configured → stub.
 * Never call carriers from UI — Communication Service owns orchestration.
 */
export function getTelephonyProvider(
  id?: TelephonyProviderId | string,
): TelephonyProvider {
  const resolved = resolveTelephonyProviderId(id);
  const existing = cache.get(resolved);
  if (existing) return existing;

  let provider: TelephonyProvider;
  switch (resolved) {
    case "twilio":
      provider = new TwilioTelephonyProvider();
      break;
    case "telnyx":
      provider = new TelnyxTelephonyProvider();
      break;
    default:
      provider = new StubTelephonyProvider();
      break;
  }
  cache.set(resolved, provider);
  return provider;
}

export function resolveTelephonyProviderId(
  preferred?: TelephonyProviderId | string,
): TelephonyProviderId {
  if (preferred === "twilio" || preferred === "telnyx" || preferred === "stub") {
    if (preferred === "twilio" && !isTwilioTelephonyConfigured()) return "stub";
    if (preferred === "telnyx" && !isTelnyxTelephonyConfigured()) return "stub";
    return preferred;
  }
  if (isTwilioTelephonyConfigured()) return "twilio";
  if (isTelnyxTelephonyConfigured()) return "telnyx";
  return "stub";
}

export function defaultTelephonyProviderId(): TelephonyProviderId {
  return resolveTelephonyProviderId();
}
