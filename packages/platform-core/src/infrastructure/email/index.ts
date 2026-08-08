import type { EmailMailbox } from "../core/types";
import { InfrastructureNotImplementedError } from "../core/types";

export interface EmailProvider {
  readonly id: string;
  /** business mailbox vs transactional is a Core concern — adapters differ */
  kind: "business" | "transactional";
  listMailboxes(organisationId: string): Promise<EmailMailbox[]>;
}

export class UnimplementedEmailProvider implements EmailProvider {
  readonly id = "unimplemented";
  readonly kind = "business" as const;

  async listMailboxes(): Promise<EmailMailbox[]> {
    throw new InfrastructureNotImplementedError(this.id, "listMailboxes");
  }
}

export function getBusinessEmailProvider(): EmailProvider | null {
  return null;
}
