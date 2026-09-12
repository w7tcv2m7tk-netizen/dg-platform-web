import type { AppManifest } from "../manifest";

export const commerceApp: AppManifest = {
  id: "commerce",
  name: "Commerce",
  description:
    "Payments, quotes, invoices, products, subscriptions and checkout — the customer-facing commercial layer",
  tier: "core",
  version: "0.3.0",
  icon: "▤",
  routes: [
    { path: "/apps/commerce", label: "Overview" },
    { path: "/apps/commerce/invoices", label: "Invoices" },
    { path: "/apps/commerce/quotes", label: "Quotes" },
    { path: "/apps/commerce/products", label: "Products" },
    { path: "/apps/commerce/subscriptions", label: "Subscriptions" },
    { path: "/apps/commerce/reports", label: "Reports" },
    { path: "/apps/commerce/payments", label: "Payments" },
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
    "commerce.checkout",
    "commerce.products",
    "commerce.subscriptions.read",
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
  aiTools: [],
  reports: [
    { id: "commerce.profit_and_loss", label: "Profit & Loss" },
    { id: "commerce.gst", label: "GST / Sales Tax" },
    { id: "commerce.cash_flow", label: "Cash Flow" },
    { id: "commerce.balance_sheet", label: "Balance Sheet (scaffolded)" },
  ],
};
