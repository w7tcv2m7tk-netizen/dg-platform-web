/**
 * Founding Reseller Partner Briefing — Monday meeting run-sheet + partner-facing copy.
 * Commercial lock lives in programme.ts; this extends the briefing narrative.
 */

export const FOUNDING_RESELLER_MEETING = {
  title: "Founding Reseller Partner Briefing",
  purpose:
    "Introduce the DigitalGate Founding Reseller Programme, establish the partner model, identify initial opportunities and agree on how we will work together.",
  keyMessage:
    "I'm not looking for you to become a software salesperson. I'm looking for people who already have relationships with business owners and can recognise where DigitalGate could genuinely help.",
  relationshipModel:
    "You open doors → DigitalGate handles the sales process → DigitalGate delivers the platform → You receive recurring commissions.",
  goldenRule: "Resellers introduce. Ben closes. DigitalGate delivers.",
  closingMessage:
    "You don't need to become a technology expert. You don't need to sell software all day. Your value is the relationships and opportunities you already have. If you identify a business that could benefit from DigitalGate, open the door. I'll take responsibility for understanding the business, demonstrating the platform, closing the opportunity and delivering the solution.",
  togetherLine:
    "You bring the relationship. DigitalGate brings the platform. Together we create the opportunity.",
} as const;

export const DIGITALGATE_FIVE_PRINCIPLES = [
  {
    name: "Connect",
    body: "Connect the systems, software and data.",
  },
  {
    name: "Centralise",
    body: "Create a trusted source of truth.",
  },
  {
    name: "Understand",
    body: "Use data, intelligence and AI to understand what is happening.",
  },
  {
    name: "Automate",
    body: "Automate repetitive work and workflows.",
  },
  {
    name: "Grow",
    body: "Turn connected information into better decisions, visibility and growth.",
  },
] as const;

export const DIGITALGATE_NOT_JUST = [
  "A CRM",
  "A website builder",
  "An SEO platform",
  "An AI tool",
  "A marketing agency",
  "An automation platform",
] as const;

export const DIGITALGATE_POSITIONING =
  "DigitalGate is an AI-powered Business Operating Platform designed to connect the systems a business already uses — the operating layer connecting a business's digital world.";

export const WHY_RESELLERS_MATTER = [
  "DigitalGate can acquire customers through advertising, SEO and outbound — but trust is one of the most valuable channels.",
  "Business owners listen when someone they already know says: “I think you should have a conversation with these guys.”",
  "Resellers already have relationships, trust, industry knowledge, local networks and professional contacts.",
  "DigitalGate provides the technology and sales infrastructure behind that relationship.",
] as const;

export const STRONG_PROSPECT_SIGNALS = [
  "Use multiple disconnected systems",
  "Have a poor or outdated digital presence",
  "Are struggling with lead generation",
  "Have follow-up problems",
  "Have lots of manual administration",
  "Want to implement AI",
  "Are growing quickly",
  "Have multiple staff using different systems",
  "Are paying for numerous separate software products",
  "Have customer data spread across different platforms",
  "Need better reporting",
  "Want automation",
  "Need industry-specific workflows",
  "Are frustrated with their current technology stack",
] as const;

export const EARLY_RESELLER_MARKETS = [
  "Real Estate",
  "Accommodation",
  "Services & Trades",
  "Professional Services",
  "Finance",
  "Automotive",
  "Property-related businesses",
] as const;

export const SALES_PROCESS_STAGES = [
  {
    stage: 1,
    owner: "Reseller",
    title: "Prospect",
    body: "Reseller identifies a potential business.",
  },
  {
    stage: 2,
    owner: "Reseller",
    title: "Introduction",
    body: "Reseller introduces the business to DigitalGate.",
  },
  {
    stage: 3,
    owner: "DigitalGate",
    title: "Discovery",
    body: "Ben understands current systems, problems, goals, growth plans, technology stack and opportunities.",
  },
  {
    stage: 4,
    owner: "DigitalGate",
    title: "Platform consultation / demonstration",
    body: "DigitalGate demonstrates the relevant platform capabilities.",
  },
  {
    stage: 5,
    owner: "DigitalGate",
    title: "Solution",
    body: "Recommend Core, Infrastructure, Industry Apps, Growth Apps, AI, Automation, Connectors and optional Professional Services.",
  },
  {
    stage: 6,
    owner: "DigitalGate",
    title: "Founding Customer application",
    body: "Prospect applies to become a Founding Customer where appropriate.",
  },
  {
    stage: 7,
    owner: "DigitalGate",
    title: "Acceptance",
    body: "DigitalGate reviews and accepts the business.",
  },
  {
    stage: 8,
    owner: "DigitalGate",
    title: "Agreement",
    body: "Customer signs the required agreement.",
  },
  {
    stage: 9,
    owner: "DigitalGate",
    title: "Onboarding",
    body: "Business setup, data, integrations, configuration, team setup, implementation and training.",
  },
  {
    stage: 10,
    owner: "DigitalGate",
    title: "Go-live",
    body: "Customer begins operating through DigitalGate.",
  },
  {
    stage: 11,
    owner: "DigitalGate",
    title: "Recurring relationship",
    body: "DigitalGate manages the ongoing platform relationship.",
  },
  {
    stage: 12,
    owner: "Reseller",
    title: "Reseller commission",
    body: "Reseller receives recurring commission according to the reseller agreement.",
  },
] as const;

export const RESELLER_JOURNEY_LINE =
  "IDENTIFY → INTRODUCE → DIGITALGATE CLOSES → DIGITALGATE DELIVERS → RESELLER EARNS";

export const INTRODUCTION_SCRIPT =
  "I've been working with Ben on a new platform called DigitalGate. It's designed to connect the different systems a business uses — CRM, website, marketing, AI, automation and more — into one operating platform. I've seen what they're building and thought it might be relevant to your business. Would you be open to having a conversation with him?";

export const WHAT_NOT_TO_PROMISE = [
  "Specific features that haven't been confirmed",
  "Future development dates",
  "Guaranteed results, leads, rankings, AI recommendations or revenue",
  "Custom development commitments",
  "Pricing outside approved arrangements",
] as const;

export const IF_YOU_DONT_KNOW =
  "I'm not sure — let me get Ben to explain that properly.";

export const COMMISSION_BRIEFING_POINTS = [
  "What constitutes a qualified referral",
  "When a referral is attributed to them",
  "What happens if multiple partners refer the same business",
  "When commission becomes payable",
  "How recurring commission works",
  "What happens if the customer cancels",
  "How upgrades/downgrades affect commission",
  "How refunds affect commission",
  "How commission is reported",
  "Payment frequency",
  "Any limits or exclusions",
] as const;

export const WHY_ATTRACTIVE_TO_RESELLER = [
  "Build a recurring revenue stream from relationships you already have",
  "Without building or supporting the software yourself",
  "No need to hire developers, run support, build CRM/AI/integrations or maintain infrastructure",
  "Your job is relationship and opportunity creation — DigitalGate does the rest",
] as const;

export const FOUNDING_STATUS_BENEFITS = [
  "Provide direct feedback",
  "Influence partner processes",
  "Help shape sales resources",
  "Identify gaps in the programme",
  "Suggest industry opportunities",
  "Help refine the reseller experience",
  "Establish an early position in the DigitalGate partner ecosystem",
] as const;

export const WEEKLY_EXPECTATIONS = [
  "Identify suitable prospects",
  "Start conversations",
  "Make introductions",
  "Keep the pipeline moving",
  "Provide feedback",
  "Learn the DigitalGate proposition",
] as const;

export const QUALITY_OVER_VOLUME =
  "One excellent business introduction is more valuable than twenty poor leads.";

export const FIRST_30_DAYS = [
  {
    week: "Week 1",
    items: ["Understand DigitalGate", "Identify initial prospects", "Make first introductions"],
  },
  {
    week: "Week 2",
    items: ["Continue introductions", "Review conversations", "Discuss objections and questions"],
  },
  {
    week: "Week 3",
    items: ["Refine targeting", "Identify strongest industries", "Improve introduction messaging"],
  },
  {
    week: "Week 4",
    items: [
      "Review results — introductions, qualified opportunities, consultations, applications, accepted customers, conversion, potential recurring revenue",
      "Determine how the partnership should evolve",
    ],
  },
] as const;

export const MEETING_DISCUSSION_PROMPTS = {
  network: [
    "Who do you already know who owns or runs a business?",
    "Which industries do you have the strongest relationships in?",
    "Do you work with business owners directly?",
    "Do you have existing client relationships?",
    "Do you belong to business groups or professional networks?",
  ],
  opportunities: [
    "Who immediately comes to mind when you hear the DigitalGate proposition?",
    "Which businesses do you know that are struggling with technology?",
    "Which businesses are growing?",
    "Which businesses are using too many disconnected systems?",
    "Which businesses are actively investing in AI?",
  ],
  strengths: [
    "Are you more comfortable making introductions or having initial conversations?",
    "Which industries do you understand best?",
    "Where do you think you could create the most opportunities?",
  ],
  expectations: [
    "What would make the partnership valuable to you?",
    "What support would you need from DigitalGate?",
    "What would make you comfortable introducing DigitalGate to your network?",
    "What concerns do you have about the reseller model?",
  ],
} as const;

export const MEETING_OUTCOMES = [
  "Their understanding of DigitalGate",
  "Their understanding of the reseller role",
  "Their preferred industries",
  "Their initial target network",
  "Their first potential prospects",
  "How introductions will be made",
  "What support they need",
  "Commission structure understood",
  "Reseller Agreement next step",
  "Partner onboarding next step",
  "First introductions identified",
  "Follow-up date agreed",
] as const;

export const MEETING_AGENDA_SECTIONS = [
  { id: "welcome", title: "Welcome & why we’re here", minutes: 5 },
  { id: "what", title: "What is DigitalGate?", minutes: 10 },
  { id: "why", title: "Why DigitalGate needs resellers", minutes: 5 },
  { id: "prospects", title: "What makes a good prospect", minutes: 10 },
  { id: "role", title: "The Founding Reseller role", minutes: 8 },
  { id: "not", title: "What the reseller does not need to do", minutes: 5 },
  { id: "process", title: "The DigitalGate sales process", minutes: 8 },
  { id: "levels", title: "Three levels of involvement", minutes: 5 },
  { id: "intro", title: "How to introduce DigitalGate", minutes: 5 },
  { id: "commission", title: "Commission & commercial model", minutes: 10 },
  { id: "founding", title: "Founding status & first 30 days", minutes: 5 },
  { id: "discussion", title: "Discussion & questions", minutes: 15 },
  { id: "close", title: "Close & next steps", minutes: 5 },
] as const;
