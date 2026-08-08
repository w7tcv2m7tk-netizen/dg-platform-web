import {
  InfrastructureNotConfiguredError,
  type DomainAvailability,
} from "../core/types";
import type { DomainProvider } from "./provider";
import {
  DreamscapeDomainProvider,
  isDreamscapeConfigured,
} from "../providers/dreamscape";

let domainProvider: DomainProvider | null = null;

export function getDomainProvider(): DomainProvider | null {
  if (!isDreamscapeConfigured()) return null;
  if (!domainProvider) {
    domainProvider = new DreamscapeDomainProvider();
  }
  return domainProvider;
}

export function requireDomainProvider(): DomainProvider {
  const provider = getDomainProvider();
  if (!provider) {
    throw new InfrastructureNotConfiguredError(
      "No domain provider configured. Set DREAMSCAPE_API_KEY (and DREAMSCAPE_RESELLER_ID for SOAP) against sandbox first.",
    );
  }
  return provider;
}

/** Convenience — search via active DomainProvider */
export async function searchDomains(
  query: string | string[],
): Promise<DomainAvailability[]> {
  return requireDomainProvider().search(query);
}

export type { DomainProvider } from "./provider";
