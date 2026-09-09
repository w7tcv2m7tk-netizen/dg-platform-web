/**
 * Aida — DigitalGate's AI Business Advisor.
 *
 * Aida is the single human-facing identity of DigitalGate's EXISTING intelligence
 * layer (Business Brain, AI Advisor, Insights, Opportunity Engine). She is NOT a
 * separate AI product, chatbot backend, model, database or parallel Business Brain
 * — this module is identity/presentation only. All reasoning, context, permissions
 * and tenant boundaries continue to come from the existing services.
 *
 * Single source of truth for Aida's name, role, positioning, copy and assets.
 */
export const AIDA = {
  name: "Aida",
  role: "AI Business Advisor",
  /** Positioning line — "Your AI Business Advisor". */
  positioning: "Your AI Business Advisor",
  /** Core one-line description. */
  description:
    "She learns your business, connects the dots across your digital world, and helps you decide what to do next.",
  /** Business Brain attribution line. */
  businessBrainTagline: "Your Business Brain. Powered by Aida.",
  /** The DigitalGate cycle Aida represents. */
  cycle: [
    "Connect",
    "Centralise",
    "Understand",
    "Decide",
    "Act",
    "Learn",
    "Grow",
  ] as const,
  /** Production assets (public/aida). Do not substitute or alter her face. */
  assets: {
    /** Small square headshot for in-app avatars. */
    avatar: "/aida/aida-avatar.webp",
    /** Wider headshot for compact hero/cards. */
    headshot: "/aida/aida-headshot.webp",
    /** Full portrait (arms crossed) for onboarding / marketing. */
    portrait: "/aida/aida-portrait.webp",
    /** Full presenting portrait for marketing "Meet Aida". */
    presenting: "/aida/aida-presenting.webp",
  },
} as const;

export type AidaCycleStage = (typeof AIDA.cycle)[number];
