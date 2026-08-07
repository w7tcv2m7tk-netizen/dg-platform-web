/**
 * Commerce domain types — customer-facing commercial layer.
 */

export const COMMERCE_CURRENCIES = ["AUD", "USD", "NZD", "EUR", "GBP"] as const;
export type CommerceCurrency = (typeof COMMERCE_CURRENCIES)[number];

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "void",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "void",
  "written_off",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_REQUEST_STATUSES = [
  "pending",
  "checkout_open",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
] as const;
export type PaymentRequestStatus = (typeof PAYMENT_REQUEST_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const REFUND_STATUSES = ["pending", "succeeded", "failed", "cancelled"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const PAYMENT_METHODS = [
  "card",
  "bank_transfer",
  "apple_pay",
  "google_pay",
  "paypal",
  "crypto_stablecoin",
  "crypto_btc",
  "crypto_eth",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PROVIDERS = ["stripe", "paypal", "square", "crypto"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export interface CommerceLineItem {
  description: string;
  quantity: number;
  unitAmountCents: number;
  currency?: CommerceCurrency;
  taxCode?: string;
  /** Tax rate in basis points (AU GST 10% = 1000) */
  taxRateBps?: number;
  productId?: string;
  metadata?: Record<string, unknown>;
}

/** Buyer / bill-to block stored on document metadata */
export interface CommerceBuyerDetails {
  name?: string;
  email?: string;
  phone?: string;
  abn?: string;
  address?: string;
}

export interface CommerceSourceEntity {
  type: string;
  id: string;
}

export interface CreatePaymentRequestInput {
  organisationId: string;
  actorId?: string;
  sourceApp: string;
  sourceEntity?: CommerceSourceEntity;
  contactId?: string;
  quoteId?: string;
  invoiceId?: string;
  lineItems: CommerceLineItem[];
  currency?: CommerceCurrency;
  allowedMethods?: PaymentMethod[];
  providerId?: PaymentProviderId;
  dueAt?: Date;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Customer-facing success/cancel URLs for hosted checkout */
  successUrl?: string;
  cancelUrl?: string;
}

export interface PaymentRequestResult {
  id: string;
  status: PaymentRequestStatus;
  totalCents: number;
  currency: CommerceCurrency;
  checkoutUrl?: string;
  paymentLinkUrl?: string;
  providerSessionId?: string;
  expiresAt?: string;
}

export interface CreateQuoteInput {
  organisationId: string;
  actorId?: string;
  contactId?: string;
  sourceApp: string;
  sourceEntity?: CommerceSourceEntity;
  lineItems: CommerceLineItem[];
  currency?: CommerceCurrency;
  validUntil?: Date;
  notes?: string;
  /** When true, unit amounts include tax */
  taxInclusive?: boolean;
  buyer?: CommerceBuyerDetails;
  metadata?: Record<string, unknown>;
}

export interface CreateInvoiceInput {
  organisationId: string;
  actorId?: string;
  contactId?: string;
  quoteId?: string;
  sourceApp: string;
  sourceEntity?: CommerceSourceEntity;
  lineItems: CommerceLineItem[];
  currency?: CommerceCurrency;
  dueAt?: Date;
  notes?: string;
  /** When true, unit amounts include tax */
  taxInclusive?: boolean;
  buyer?: CommerceBuyerDetails;
  metadata?: Record<string, unknown>;
}

export interface CommerceFinancialSnapshot {
  organisationId: string;
  capturedAt: Date;
  revenueMtdCents: number;
  revenueYtdCents: number;
  outstandingArCents: number;
  overdueArCents: number;
  mrrCents: number;
  activeSubscriptions: number;
  failedPayments30d: number;
  refunds30dCents: number;
  avgPaymentDays: number | null;
  paymentMethodBreakdown: Record<string, number>;
  topCustomers: Array<{ contactId: string; name: string; revenueCents: number }>;
}

export function sumLineItemsCents(items: CommerceLineItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitAmountCents, 0);
}

/** Tax-exclusive total including GST (legacy helper) */
export function lineItemsWithTaxCents(items: CommerceLineItem[]) {
  return items.reduce((sum, item) => {
    const subtotal = item.quantity * item.unitAmountCents;
    const tax = item.taxRateBps ? Math.round((subtotal * item.taxRateBps) / 10000) : 0;
    return sum + subtotal + tax;
  }, 0);
}
