export * from "./types";
export {
  createPaymentRequest,
  recordPaymentFromWebhook,
  listPaymentRequestsForEntity,
  processPaymentWebhookEvent,
  confirmCheckoutSession,
  getCommerceFinancialSnapshot,
} from "./payment-engine";
export {
  createQuote,
  createInvoice,
  acceptQuote,
  listQuotes,
  listQuotesForEntity,
  listInvoices,
  listInvoicesForEntity,
  getQuote,
  getInvoice,
  sendInvoice,
} from "./document-engine";
export { getStripeSetupStatus } from "./stripe-setup";
export type { StripeSetupStatus } from "./stripe-setup";
export {
  registerPaymentConnector,
  getPaymentConnector,
  listPaymentConnectors,
  requirePaymentConnector,
  defaultPaymentProviderId,
  bootPaymentConnectors,
} from "./connectors";

import { bootDefaultAutomations } from "../automation";

bootDefaultAutomations();
