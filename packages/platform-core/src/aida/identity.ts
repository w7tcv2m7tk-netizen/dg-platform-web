/** Public DigitalGate website only — never other tenant sites. */
export const PUBLIC_AIDA_SITE_SLUG = "digitalgate";

export const AIDA_OPENING_MESSAGE =
  "Hi, I’m Aida. I’m DigitalGate’s AI Business Advisor. I can help you understand the platform, explore how DigitalGate could help your business, or point you in the right direction.";

export const AIDA_QUICK_ACTIONS = [
  {
    id: "help_my_business",
    label: "How could DigitalGate help my business?",
    prompt: "How could DigitalGate help my business?",
  },
  {
    id: "show_platform",
    label: "Show me the platform",
    prompt: "Show me the platform",
  },
  {
    id: "what_is_brain",
    label: "What is Business Brain?",
    prompt: "What is Business Brain?",
  },
  {
    id: "talk_to_someone",
    label: "I’d like to talk to someone",
    prompt: "I’d like to talk to someone",
  },
] as const;

export type AidaQuickActionId = (typeof AIDA_QUICK_ACTIONS)[number]["id"];

export function isPublicAidaSiteSlug(slug: string | null | undefined): boolean {
  return (slug ?? "").trim().toLowerCase() === PUBLIC_AIDA_SITE_SLUG;
}

export function isAidaQuickActionId(value: string): value is AidaQuickActionId {
  return AIDA_QUICK_ACTIONS.some((a) => a.id === value);
}
