/** Domain events — every platform action should emit one of these (or extend). */

export type PlatformEventType =
  | "contact.created"
  | "contact.updated"
  | "company.created"
  | "lead.created"
  | "property.created"
  | "property.listed"
  | "booking.confirmed"
  | "invoice.paid"
  | "review.received"
  | "organisation.created"
  | "app.installed";

export interface PlatformEvent<TPayload = Record<string, unknown>> {
  type: PlatformEventType;
  organisationId: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  payload: TPayload;
  occurredAt: Date;
}

export type EventHandler = (event: PlatformEvent) => void | Promise<void>;
