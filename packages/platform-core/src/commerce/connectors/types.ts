import type {
  CommerceCurrency,
  CommerceLineItem,
  PaymentMethod,
  PaymentProviderId,
  RefundStatus,
} from "../types";

/** Normalized webhook events from any payment provider */
export type PaymentWebhookEventType =
  | "checkout.completed"
  | "checkout.expired"
  | "payment.failed"
  | "payment.disputed"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.payment_action_required"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "refund.created"
  | "refund.failed"
  /** Stripe Connect — referrer Express account status */
  | "connect.account.updated"
  /** Stripe Connect — transfer to referrer failed / reversed */
  | "connect.transfer.failed"
  | "connect.transfer.reversed"
  | "customer.updated"
  /** Stripe sent an event we do not process — acknowledge without error */
  | "ignored";

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType;
  providerId: PaymentProviderId;
  providerEventId: string;
  organisationId?: string;
  paymentRequestId?: string;
  providerPaymentId?: string;
  providerCustomerId?: string;
  amountCents?: number;
  currency?: CommerceCurrency;
  paymentMethod?: PaymentMethod;
  /** Stripe invoice billing_reason when type is invoice.paid */
  billingReason?: string;
  /** Stripe invoice / subscription ids for referral accrual */
  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
  platformTier?: string;
  /** Stripe Connect account id (acct_…) */
  connectAccountId?: string;
  /** Stripe Transfer id (tr_…) */
  transferId?: string;
  /** Failure / reverse reason from Stripe when present */
  failureMessage?: string;
  occurredAt: Date;
  raw?: unknown;
}

export interface CreateCheckoutSessionInput {
  organisationId: string;
  paymentRequestId: string;
  lineItems: CommerceLineItem[];
  currency: CommerceCurrency;
  allowedMethods: PaymentMethod[];
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  providerSessionId: string;
  checkoutUrl: string;
  expiresAt?: Date;
}

export interface CreatePaymentLinkInput {
  organisationId: string;
  paymentRequestId: string;
  lineItems: CommerceLineItem[];
  currency: CommerceCurrency;
  allowedMethods: PaymentMethod[];
  metadata?: Record<string, unknown>;
}

export interface PaymentLinkResult {
  providerLinkId: string;
  paymentLinkUrl: string;
}

export interface RefundPaymentInput {
  organisationId: string;
  providerPaymentId: string;
  amountCents?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundPaymentResult {
  providerRefundId: string;
  status: RefundStatus;
  amountCents: number;
}

export interface ConnectorHealthResult {
  ok: boolean;
  providerId: PaymentProviderId;
  message?: string;
  accountId?: string;
  livemode?: boolean;
}

/**
 * Payment Connector — adapter for Stripe, PayPal, Square, Crypto, etc.
 * Platform owns business logic; connectors own provider APIs and compliance.
 */
export interface PaymentConnector {
  readonly id: PaymentProviderId;

  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult>;

  createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkResult>;

  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;

  /** Verify signature and return normalized platform event */
  parseWebhook(
    payload: string | Buffer,
    headers: Record<string, string | undefined>,
  ): Promise<PaymentWebhookEvent>;

  /** Fetch a paid checkout session from the provider (success-page fallback) */
  retrievePaidCheckoutSession?(
    providerSessionId: string,
  ): Promise<PaymentWebhookEvent | null>;

  healthCheck(organisationId: string): Promise<ConnectorHealthResult>;
}

export interface PaymentConnectorManifest {
  id: PaymentProviderId;
  name: string;
  description: string;
  supportedMethods: PaymentMethod[];
  supportsSubscriptions: boolean;
  supportsRefunds: boolean;
  supportsPaymentLinks: boolean;
  webhookPath: string;
}
