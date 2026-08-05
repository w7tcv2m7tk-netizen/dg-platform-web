import type { AppManifest } from "../manifest";

export const commerceApp: AppManifest = {
  id: "commerce",
  name: "Commerce",
  description:
    "Payments, quotes, invoices, subscriptions, and checkout — the customer-facing commercial layer",
  tier: "core",
  version: "0.1.0",
  icon: "▤",
  routes: [
    { path: "/apps/commerce", label: "Overview" },
    { path: "/apps/commerce/invoices", label: "Invoices" },
    { path: "/apps/commerce/quotes", label: "Quotes" },
    { path: "/apps/commerce/payments", label: "Payments" },
    { path: "/apps/commerce/products", label: "Products" },
    { path: "/apps/commerce/subscriptions", label: "Subscriptions" },
  ],
  navigation: [
    { href: "/apps/commerce", label: "Commerce", icon: "▤" },
  ],
  permissions: [
    { id: "commerce.read", label: "View commerce" },
    { id: "commerce.manage", label: "Manage quotes, invoices, products" },
    { id: "commerce.payments", label: "Request and refund payments" },
    { id: "commerce.settings", label: "Configure payment providers" },
  ],
  features: [
    "commerce.payments",
    "commerce.quotes",
    "commerce.invoices",
    "commerce.subscriptions",
    "commerce.checkout",
    "commerce.products",
    "commerce.crypto",
  ],
  entities: [
    "CommerceProduct",
    "CommerceQuote",
    "CommerceInvoice",
    "CommercePaymentRequest",
    "CommercePayment",
    "CommerceSubscription",
    "CommerceRefund",
  ],
  automationTriggers: [
    { id: "commerce.payment.completed", label: "Payment completed", objectType: "CommercePayment" },
    { id: "commerce.payment.failed", label: "Payment failed", objectType: "CommercePaymentRequest" },
    { id: "commerce.invoice.overdue", label: "Invoice overdue", objectType: "CommerceInvoice" },
    { id: "commerce.quote.accepted", label: "Quote accepted", objectType: "CommerceQuote" },
    { id: "commerce.subscription.created", label: "Subscription started", objectType: "CommerceSubscription" },
  ],
  automationActions: [
    { id: "commerce.request_payment", label: "Send payment request" },
    { id: "commerce.send_invoice", label: "Send invoice" },
    { id: "commerce.send_quote", label: "Send quote" },
    { id: "commerce.enable_payment_reminders", label: "Enable payment reminders" },
  ],
  aiTools: [
    {
      id: "commerce.cash_flow_forecast",
      label: "Cash flow forecast",
      description: "Predict cash flow from historical payment patterns",
    },
    {
      id: "commerce.overdue_insights",
      label: "Overdue invoice insights",
      description: "Summarise overdue AR and recommend follow-ups",
    },
    {
      id: "commerce.payment_velocity",
      label: "Payment velocity analysis",
      description: "Track average days to pay and trend changes",
    },
  ],
  reports: [
    { id: "commerce.revenue", label: "Revenue" },
    { id: "commerce.outstanding_ar", label: "Outstanding invoices" },
    { id: "commerce.mrr", label: "Recurring revenue" },
    { id: "commerce.failed_payments", label: "Failed payments" },
    { id: "commerce.refunds", label: "Refund rate" },
    { id: "commerce.payment_methods", label: "Payment method breakdown" },
  ],
};
