/**
 * DigitalGate Founding Reseller Programme™ — commercial lock.
 * Not an affiliate programme. Invitation / acceptance only.
 * These definitions are for product + approved copy. Binding terms require solicitor review.
 */

export const FOUNDING_RESELLER_PROGRAMME_NAME =
  "DigitalGate Founding Reseller Programme";

export const RESELLER_MODEL =
  "Reseller introduces → DigitalGate qualifies → Ben / DigitalGate demonstrates → Customer applies → DigitalGate accepts → Customer subscribes → Reseller earns commission";

export const RESELLER_OPERATING_TARGET = {
  /** Recruit 3–5 excellent introducers first */
  firstWave: 5,
  /** Founding 10 reseller seat cap */
  founding10Cap: 10,
} as const;

export const FOUNDING_CUSTOMER_BENEFITS = [
  "30% off initial Platform + Apps for 24 months",
  "Priority onboarding",
  "Early access to selected Apps",
  "Founding recognition",
  "Roadmap feedback",
  "Preferential Professional Services terms where applicable",
] as const;

/** Customer offer — reseller is invitation only, not automatic */
export const FOUNDING_RESELLER_INVITE_LINE =
  "Selected Founding 10 members may be invited into the DigitalGate Founding Reseller Programme — 30% commission on qualifying Platform + App subscription fees for the first 12 months of each new customer they directly refer. Invitation only; not automatic.";

export const QUALIFYING_COMMISSION_FEES = {
  includes: [
    "Recurring DigitalGate Platform subscription fees actually received",
    "Recurring DigitalGate App subscription fees actually received",
    "Qualifying recurring subscription upgrades during the original 12-month commission period",
  ],
  excludes: [
    "GST and other taxes or government charges",
    "Refunds, chargebacks, reversals, write-offs, and failed payments",
    "Payment processing fees",
    "Professional Services, consulting, implementation, migration, custom development, and training",
    "Separately charged support plans",
    "One-off fees",
    "Hardware, third-party software, advertising spend, media spend",
    "Domain registration, third-party hosting, and other pass-through costs",
    "The reseller's own account, or a business they own or control, unless DigitalGate approves in writing",
  ],
  rules: [
    "Commission is a percentage of qualifying recurring Platform + App fees actually received — not list price, and not the whole invoice",
    "The customer's Founding discount does not change the commission percentage; it reduces the qualifying amount received",
    "Example: $500 list with 30% founding discount → $350 received → 30% × $350 = $105/month",
    "Commission period is the first 12 months from the referred customer's first paid subscription and does not restart on upgrades",
    "Upgrades during the window may increase qualifying fees; downgrades reduce commission accordingly",
    "Cancellation stops commission when qualifying revenue stops; the 12-month clock does not continue while inactive",
    "Attribution is recorded permanently; commission is not perpetual",
    "Only one reseller is normally paid per customer; DigitalGate CRM is the primary attribution record",
    "Existing DigitalGate customers are not commissionable merely because a reseller later introduces another App",
    "Customer Founding Discount and reseller commission are separate benefits and may both apply to the same customer",
  ],
} as const;

export const RESELLER_MUST_NOT_CLAIM = [
  "Guaranteed leads, rankings, AI recommendations, revenue, listings, or results",
  "Unreleased features or development timelines",
  "Discounts DigitalGate has not approved",
  "Unlimited support, lifetime pricing, or lifetime free Apps",
  "Custom development included in subscription pricing",
  "That they are DigitalGate staff, or that they sell, implement, or support DigitalGate independently",
] as const;

export const RESELLER_MAY = [
  "Identify suitable Australian businesses",
  "Introduce owners or decision-makers to DigitalGate",
  "Share approved DigitalGate information",
  "Arrange an introduction",
  "Explain at a high level what DigitalGate does",
  "Refer prospects through the DigitalGate referral system",
] as const;

export const RESELLER_NEED_NOT = [
  "Conduct technical demonstrations",
  "Configure, implement, or support DigitalGate",
  "Negotiate contracts or collect subscription payments",
  "Make product or performance guarantees",
] as const;

export const APPROVED_PARTNER_MESSAGING = {
  programmeName: FOUNDING_RESELLER_PROGRAMME_NAME,
  headline: "Build a valuable referral revenue stream",
  body: "Selected Founding 10 members may be invited to become DigitalGate Founding Resellers. Founding Resellers can earn 30% commission on qualifying Platform + App subscription fees for the first 12 months of every new customer they directly refer.",
  close: "DigitalGate handles qualification, demonstration, contracting, onboarding and customer billing. You make the introduction. We do the selling. They build their business on DigitalGate.",
  example:
    "Example: A customer paying an average of $500/month in qualifying subscription fees could generate up to $1,800 in referral commission during their first 12 months.",
  examplePaid:
    "If that customer receives a 30% Founding discount, DigitalGate receives $350/month and the reseller earns 30% × $350 = $105/month.",
  disclaimer:
    "Illustrative example only. Actual commission depends on customer subscription value, founding discounts, payment status, retention and qualifying fees. Not an earnings guarantee. Binding terms are subject to solicitor review.",
  doNotSay: "Make $180,000 a year referring DigitalGate.",
  notAffiliate:
    "This is not an affiliate programme. It is a controlled founding channel for trusted introducers.",
  runRateNote:
    "Any large annual figure is an end-of-year annualised run-rate if the referred base stays commissionable — not cash earned in year one.",
} as const;

export const PARTNER_REFERRAL_STATUS_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  INTRODUCED: "Introduced",
  INVITED: "Prospect",
  REFERRED: "Introduced",
  CONTACTED: "Contacted",
  CONSULTATION: "Consultation",
  APPLICATION: "Application",
  ONBOARDING: "Application",
  ACCEPTED: "Accepted",
  CUSTOMER: "Customer",
  ACTIVE: "Active",
  COMMISSIONING: "Active",
  CANCELLED: "Cancelled",
  CLOSED: "Cancelled",
  DECLINED: "Declined",
};

export const SOLICITOR_REVIEW_NOTE =
  "These programme rules are DigitalGate's commercial definitions for product and approved copy. They are not published as binding legal terms until reviewed by DigitalGate's solicitor and accountant (GST, payment timing, attribution, and agency).";
