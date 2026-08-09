/**
 * Business mailbox provider — Dreamscape email hosting (stub → real SKU later).
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */

import type { EmailMailbox } from "../core/types";
import { InfrastructureNotImplementedError } from "../core/types";
import { isDreamscapeConfigured } from "../providers/dreamscape/client";

export interface BusinessMailboxProvider {
  readonly id: string;
  readonly kind: "business";
  isConfigured(): boolean;
  listMailboxes(organisationId: string): Promise<EmailMailbox[]>;
  /** Provision stub — throws until Dreamscape product mapping ships */
  provisionMailbox?(input: {
    organisationId: string;
    domain: string;
    localPart: string;
  }): Promise<EmailMailbox>;
}

/**
 * Placeholder adapter — Dreamscape reseller can sell email hosting;
 * Gen 2 does not call mailbox APIs yet.
 */
export class DreamscapeMailboxProvider implements BusinessMailboxProvider {
  readonly id = "dreamscape";
  readonly kind = "business" as const;

  isConfigured(): boolean {
    return isDreamscapeConfigured();
  }

  async listMailboxes(_organisationId: string): Promise<EmailMailbox[]> {
    // No Dreamscape mailbox list wired yet — return empty rather than throw
    // so Email overview stays honest.
    return [];
  }

  async provisionMailbox(): Promise<EmailMailbox> {
    throw new InfrastructureNotImplementedError(
      this.id,
      "provisionMailbox — Dreamscape email hosting SKU mapping not shipped",
    );
  }
}

export function getBusinessMailboxProvider(): BusinessMailboxProvider | null {
  if (!isDreamscapeConfigured()) return null;
  return new DreamscapeMailboxProvider();
}
