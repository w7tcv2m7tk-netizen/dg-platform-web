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
  | "commerce.payment_request.created"
  | "commerce.payment.completed"
  | "commerce.payment.failed"
  | "commerce.invoice.sent"
  | "commerce.invoice.overdue"
  | "commerce.quote.accepted"
  | "commerce.subscription.created"
  | "commerce.subscription.updated"
  | "commerce.refund.created"
  | "review.received"
  | "organisation.created"
  | "app.installed"
  | "prospect.created"
  | "prospect.report_sent"
  | "prospect.report_viewed"
  | "prospect.proposal_accepted";

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
