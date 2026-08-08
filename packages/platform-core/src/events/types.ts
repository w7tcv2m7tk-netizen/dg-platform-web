/** Domain events — every platform action should emit one of these (or extend). */

export type PlatformEventType =
  | "contact.created"
  | "contact.updated"
  | "company.created"
  | "lead.created"
  | "lead.converted"
  | "lead.stage_changed"
  | "opportunity.created"
  | "opportunity.stage_changed"
  | "opportunity.won"
  | "opportunity.lost"
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
  | "review.request_queued"
  | "business_referral.created"
  | "business_referral.status_changed"
  | "organisation.created"
  | "app.installed"
  | "prospect.created"
  | "prospect.archived"
  | "prospect.restored"
  | "prospect.report_sent"
  | "prospect.report_viewed"
  | "prospect.proposal_accepted"
  | "platform_referral.invited"
  | "platform_referral.signed_up"
  | "platform_referral.paid"
  | "platform_referral.credit_accrued"
  | "platform_referral.cash_payout_requested"
  | "platform_referral.cash_payout_failed"
  | "platform_referral.connect_updated";

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
