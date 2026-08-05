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
  listInvoices,
  sendInvoice,
} from "./document-engine";
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
