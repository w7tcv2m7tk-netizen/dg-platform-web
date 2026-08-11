/**
 * ASIC connector stub — AU Business Names & Companies Register (DSP APIs).
 *
 * Customer UI: never brand as “ASIC” — use Business Setup / Register business name.
 * Status remains pending_provider_approval until DSP application + test env.
 *
 * DO NOT implement production registration submit here.
 *
 * @see docs/foundations/BUSINESS-SETUP.md
 */

export const ASIC_CONNECTOR_ID = "asic" as const;

/** Honest gate — engineering must not treat this as connected. */
export const ASIC_CONNECTOR_STATUS = "pending_provider_approval" as const;

export type AsicConnectorLifecycle =
  | "pending_provider_approval"
  | "test_env"
  | "production";

export type AsicRegistrationSubmitRequest = {
  /** Intentionally opaque — production shape TBD after API approval */
  businessName: string;
};

export type AsicRegistrationSubmitResult = {
  ok: false;
  reason: string;
};

export function getAsicConnectorLifecycle(): AsicConnectorLifecycle {
  return ASIC_CONNECTOR_STATUS;
}

export function asicRegistrationAvailable(): boolean {
  return false;
}

/**
 * Explicit hold — production (and test) registration submit is not built.
 * After DSP approval, implement against ASIC test environment only.
 */
export async function submitBusinessNameRegistration(
  _req: AsicRegistrationSubmitRequest,
): Promise<AsicRegistrationSubmitResult> {
  return {
    ok: false,
    reason:
      "ASIC registration is blocked until digital service provider approval and test-environment access. Contact webservices@asic.gov.au — do not screen-scrape.",
  };
}
