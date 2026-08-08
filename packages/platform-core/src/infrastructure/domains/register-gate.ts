/**
 * Safety gates for paid domain registration.
 * - Org feature flag: infra.domain_register
 * - Optional env kill-switch: DG_DOMAIN_REGISTER_ENABLED=0
 * - Production requires explicit confirmProduction + typed domain confirm
 */

import { organisationHasFlag } from "../../features/flags";
import { resolveDreamscapeConfig } from "../providers/dreamscape/client";

export class DomainRegisterBlockedError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainRegisterBlockedError";
    this.code = code;
  }
}

/** Env kill-switch — unset or "1"/"true" allows; "0"/"false" blocks globally. */
export function isDomainRegisterEnvEnabled(): boolean {
  const raw = process.env.DG_DOMAIN_REGISTER_ENABLED?.trim().toLowerCase();
  if (raw == null || raw === "") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return true;
}

export async function assertDomainRegisterAllowed(input: {
  organisationId: string;
  domain: string;
  /** Must exactly match the domain being registered */
  confirmDomain: string;
  /** Required when SOAP/REST is production */
  confirmProduction?: boolean;
}): Promise<{ isSandbox: boolean; apiMode: "soap" | "rest" }> {
  if (!isDomainRegisterEnvEnabled()) {
    throw new DomainRegisterBlockedError(
      "register_disabled",
      "Domain registration is disabled (DG_DOMAIN_REGISTER_ENABLED=0).",
    );
  }

  const flagOn = await organisationHasFlag(
    input.organisationId,
    "infra.domain_register",
  );
  if (!flagOn) {
    throw new DomainRegisterBlockedError(
      "flag_required",
      "Enable feature flag infra.domain_register on this organisation before registering domains.",
    );
  }

  const domain = input.domain.trim().toLowerCase();
  const confirm = input.confirmDomain.trim().toLowerCase();
  if (!domain || confirm !== domain) {
    throw new DomainRegisterBlockedError(
      "confirm_required",
      "Type the exact domain name to confirm registration (paid operation).",
    );
  }

  const { isSandbox, apiMode } = resolveDreamscapeConfig();
  if (!isSandbox && input.confirmProduction !== true) {
    throw new DomainRegisterBlockedError(
      "production_confirm_required",
      "Production registration requires confirmProduction: true — this will charge the reseller account.",
    );
  }

  return { isSandbox, apiMode };
}
