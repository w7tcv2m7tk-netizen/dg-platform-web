/** Canonical Intelligence architecture — one question per surface. @see docs/foundations/INTELLIGENCE-ARCHITECTURE.md */

export type IntelligenceSurface = {
  id: string;
  label: string;
  question: string;
  href: string;
  detail?: string;
};

export const INTELLIGENCE_FOUNDATION: IntelligenceSurface[] = [
  {
    id: "twin",
    label: "Digital Twin",
    question: "What does DigitalGate currently know?",
    detail: "The live state of the business.",
    href: "/dashboard/twin",
  },
  {
    id: "brain",
    label: "Business Brain",
    question: "What does DigitalGate understand about the business?",
    detail: "Strategy, goals, knowledge, documents, context and business rules.",
    href: "/dashboard/brain",
  },
];

export const INTELLIGENCE_ANALYSIS: IntelligenceSurface[] = [
  {
    id: "health",
    label: "Business Health",
    question: "How healthy is the business?",
    detail: "A synthesised view of business health across connected signals.",
    href: "/dashboard/health",
  },
  {
    id: "benchmarks",
    label: "Benchmarks",
    question: "How does the business compare?",
    detail: "Relevant comparative performance where sufficient data exists.",
    href: "/dashboard/benchmarks",
  },
  {
    id: "insights",
    label: "Insights",
    question: "What is DigitalGate noticing?",
    detail: "Patterns, changes, opportunities, risks and anomalies.",
    href: "/dashboard/insights",
  },
];

export const INTELLIGENCE_ACTION: IntelligenceSurface[] = [
  {
    id: "advisor",
    label: "AI Advisor",
    question: "What should the business do?",
    detail: "Reasoned recommendations based on Twin + Brain + live signals.",
    href: "/dashboard/advisor",
  },
  {
    id: "actions",
    label: "Recommended Actions",
    question: "What matters most right now?",
    detail: "Prioritised next steps from Advisor reasoning.",
    href: "/dashboard/advisor",
  },
  {
    id: "command",
    label: "Command Centre",
    question: "What needs to happen next?",
    detail: "Prioritised actions and execution.",
    href: "/dashboard",
  },
];

export const INTELLIGENCE_OUTPUT: IntelligenceSurface = {
  id: "reports",
  label: "Reports",
  question: "What needs to be communicated or exported?",
  detail: "Formal outputs generated from the intelligence layer.",
  href: "/dashboard/reports",
};

export const ANALYTICS_RELATED = {
  label: "Analytics",
  question: "What do the numbers show?",
  detail: "Explore the underlying performance data behind your DigitalGate intelligence.",
  href: "/apps/analytics",
};

export type IntelligenceHierarchyActive =
  | "twin"
  | "brain"
  | "health"
  | "benchmarks"
  | "insights"
  | "advisor"
  | "reports"
  | "command";

export const INTELLIGENCE_ACTIVE_LABEL: Record<IntelligenceHierarchyActive, string> = {
  twin: "Digital Twin",
  brain: "Business Brain",
  health: "Business Health",
  benchmarks: "Benchmarks",
  insights: "Insights",
  advisor: "AI Advisor",
  reports: "Reports",
  command: "Command Centre",
};
