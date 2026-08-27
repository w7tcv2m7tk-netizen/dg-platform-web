/**
 * DigitalGate Founding Reseller Programme™ — commercial lock.
 * Not an affiliate programme. Invitation / acceptance only.
 * These definitions are for product + approved copy. Binding terms require solicitor review.
 */

export const FOUNDING_RESELLER_PROGRAMME_NAME =
  "DigitalGate Founding Reseller Programme";

export const RESELLER_MODEL =
  "Resellers introduce and qualify. Ben closes. DigitalGate delivers.";

/** Explicit introducer positioning — not a traditional reseller who sells/owns/supports. */
export const FOUNDING_RESELLER_POSITIONING = {
  headline: "Introduce. Refer. Earn recurring revenue.",
  body: "You introduce the opportunity. DigitalGate handles discovery, demonstration, proposal, onboarding and customer success.",
  principle:
    "Founding Resellers don't sell, onboard or support customers. They introduce qualified businesses to DigitalGate. Ben / DigitalGate closes the opportunity.",
} as const;

export const FOUNDING_RESELLER_HOW_IT_WORKS = [
  {
    n: "01",
    title: "Introduce",
    body: "Identify a business that could benefit from DigitalGate.",
  },
  {
    n: "02",
    title: "Refer",
    body: "Make the introduction through DigitalGate.",
  },
  {
    n: "03",
    title: "DigitalGate qualifies",
    body: "We run discovery, assess fit and demonstrate the platform.",
  },
  {
    n: "04",
    title: "DigitalGate closes",
    body: "We handle proposal, commercial terms and customer onboarding.",
  },
  {
    n: "05",
    title: "Customer goes live",
    body: "DigitalGate or a Certified Delivery Partner implements the platform.",
  },
  {
    n: "06",
    title: "You earn",
    body: "Receive recurring commission on qualifying DigitalGate Platform and App revenue.",
  },
] as const;

export const FOUNDING_RESELLER_WHY = [
  "Early access to DigitalGate",
  "Founding partner economics",
  "Recurring commissions",
  "Direct relationship with DigitalGate",
  "Early influence on the partner programme",
  "No technical implementation responsibility",
  "DigitalGate closes and delivers the customer",
] as const;

export const FOUNDING_RESELLER_WORKFLOW_STRIP =
  "Identify → Introduce → DigitalGate qualifies → DigitalGate closes → Customer goes live → Reseller earns recurring commission";

export const RESELLER_PROCESS_FLOW = {
  reseller: [
    "Identify prospect",
    "Initial conversation",
    "Qualify basic fit",
    "Warm introduction",
  ],
  digitalgate: [
    "Discovery",
    "Platform consultation",
    "Demonstration",
    "Solution / pricing",
    "Founding Customer application",
    "Acceptance",
    "Agreement",
    "Onboarding",
    "Implementation",
    "Go-live",
    "Ongoing customer relationship",
  ],
  resellerAfter: ["Receives commission", "Continues introducing opportunities"],
} as const;

export const FOUNDING_RESELLER_ONE_LINER =
  "I've been working with Ben on a new platform called DigitalGate. It's designed to connect the different systems a business uses — CRM, website, marketing, AI, automation and more — into one operating platform. I've seen what they're building and thought it might be relevant to your business. Would you be open to having a conversation with him?";

export const FOUNDING_RESELLER_ROLE = {
  principle:
    "Founding Reseller = Introducer + Relationship Partner — not merely an affiliate.",
  expectations: [
    {
      title: "Identify potential businesses",
      body: "Use your existing network to spot businesses that could benefit from DigitalGate. You don't need to know every feature — recognise a good opportunity.",
      example:
        "I've been working with Ben on a new business platform called DigitalGate. I think it could be relevant to your business. Would you be open to having a conversation with him?",
    },
    {
      title: "Make the introduction",
      body: "Your most important job is a warm introduction — not just handing over a name.",
      example:
        "Ben, meet Sarah. Sarah runs XYZ and I thought the DigitalGate platform might be very relevant to what they're doing. Sarah, Ben is the founder and platform architect.",
    },
    {
      title: "Provide basic context",
      body: "Before or during the introduction, share who the business is, what they do, why DigitalGate might fit, any obvious problem or opportunity, and your relationship with them. No technical discovery required.",
    },
    {
      title: "Help maintain the relationship",
      body: "Occasionally reinforce the conversation if you have a strong relationship — that's more powerful than another cold follow-up from Ben.",
      example:
        "Have you had a chance to speak with Ben about DigitalGate? / I think you should seriously have a look at what they're building.",
    },
  ],
} as const;

export const RESELLER_PARTNER_LEVELS = [
  {
    level: "Level 1 — Introducer",
    summary: "Identify and introduce prospects. Minimum expectation: warm introductions.",
    startHere: true,
  },
  {
    level: "Level 2 — DigitalGate Partner",
    summary:
      "Understand the proposition well enough to discuss the problem DigitalGate solves, core platform, Industry Apps, AI, automation, Digital Twin, Business Brain, and relevant frameworks. Still no demo or configuration.",
    startHere: true,
  },
  {
    level: "Level 3 — Strategic Reseller",
    summary:
      "Selected partners may eventually conduct initial discovery, run basic demonstrations, identify platform opportunities, and specialise in an industry. First Founding Resellers start at Level 1/2 — not Level 3.",
    startHere: false,
  },
] as const;

export const RESELLER_MUST_NOT_DO = [
  "Conduct platform demonstrations",
  "Configure DigitalGate",
  "Onboard customers",
  "Provide technical support",
  "Build websites",
  "Configure CRM",
  "Set up AI",
  "Manage accounts",
  "Close deals",
  "Negotiate pricing",
  "Explain the entire architecture",
  "Promise functionality",
  "Make technical commitments",
  "Manage customer implementation",
] as const;

export const GOOD_PROSPECT_SIGNALS = [
  "Disconnected systems — CRM, website, marketing, and operations don't talk to each other",
  "Data and workflows scattered across multiple tools",
  "Owner or decision-maker open to a structured business conversation",
  "Follow-up, lead handling, or customer communication feels manual or inconsistent",
  "Growing complexity where AI and automation could help — but nothing is joined up",
  "Real estate, accommodation, services, or other businesses running on spreadsheets and ad-hoc tools",
] as const;

export const PARTNER_BRIEFING_OUTLINE = [
  { minutes: 10, title: "Why DigitalGate exists", body: "The disconnected-business problem." },
  { minutes: 10, title: "What DigitalGate actually is", body: "A Business Operating Platform." },
  {
    minutes: 10,
    title: "Who it's for",
    body: "Businesses where disconnected systems, data, AI and workflows are creating complexity.",
  },
  {
    minutes: 10,
    title: "What makes a good prospect",
    body: "The most important section — who to introduce and why.",
  },
  {
    minutes: 10,
    title: "How the reseller process works",
    body: "Prospect → introduction → Ben → consultation → close → onboarding → commission.",
  },
  {
    minutes: 10,
    title: "How they make money",
    body: "Referrals and recurring commission on qualifying subscription fees.",
  },
  {
    minutes: 10,
    title: "Role play",
    body: "Practice opening conversations — real estate agency, five different systems, follow-up struggles.",
  },
] as const;

export const PARTNER_ROLE_PLAY_SCENARIOS = [
  {
    scenario: "I know a real estate agency…",
    opener:
      "I've been working with Ben on DigitalGate — it connects CRM, listings, marketing and follow-up in one platform. Would you be open to a short conversation with him?",
  },
  {
    scenario: "I know a business owner using five different systems…",
    opener:
      "Ben has built a platform that brings CRM, website, marketing, AI and automation together. I thought it might be relevant given how many tools you're juggling.",
  },
  {
    scenario: "I've got a client struggling with follow-up…",
    opener:
      "DigitalGate might help — it's designed to connect customer communication, CRM and automation so follow-up isn't lost between systems. Worth a conversation with Ben?",
  },
] as const;

/** Legacy model string for terms / backward-compatible copy */
export const RESELLER_MODEL_LEGACY =
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
    "Recurring DigitalGate Industry App subscription fees actually received ($99/mo)",
    "Recurring additional Industry Template fees actually received (+$29/mo each)",
    "Other recurring DigitalGate App subscription fees actually received (Growth Apps, etc.)",
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
  "Onboard customers (unless separately certified as a Certified Delivery Partner)",
  "Negotiate contracts or collect subscription payments",
  "Make product or performance guarantees",
] as const;

export const APPROVED_PARTNER_MESSAGING = {
  programmeName: FOUNDING_RESELLER_PROGRAMME_NAME,
  headline: "Build a valuable referral revenue stream",
  body: "Selected Founding 10 members may be invited to become DigitalGate Founding Resellers. Founding Resellers can earn 30% commission on qualifying Platform + App subscription fees for the first 12 months of every new customer they directly refer.",
  close: "DigitalGate handles qualification, demonstration, contracting, onboarding and customer billing. You make the introduction. We do the selling. They build their business on DigitalGate.",
  oneLiner: FOUNDING_RESELLER_ONE_LINER,
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

/** Bump when programme rules on /partner/terms change in a material way. */
export const FOUNDING_RESELLER_TERMS_VERSION = "2026-08-founding-reseller-v1";
