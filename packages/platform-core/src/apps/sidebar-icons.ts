/** Geometric sidebar glyphs — keep in sync with shell nav. */
const DEFAULT = "◈";

const SIDEBAR_ICONS: Record<string, string> = {
  // Business workspace shell
  overview: "◉",
  "business-profile": "◇",
  team: "⊕",
  apps: "▦",
  marketplace: "▣",
  network: "◎",
  settings: "⎔",
  referrals: "⇄",
  twin: "◉",
  goals: "◎",
  health: "◍",
  advisor: "✦",
  benchmarks: "▥",
  reports: "▤",
  intelligence: "✦",
  // Apps
  crm: "◎",
  commerce: "▤",
  "real-estate": "⌂",
  accommodation: "◫",
  finance: "▣",
  services: "⬡",
  creator: "◈",
  commercial: "▦",
  "property-management": "⌂",
  automotive: "⬡",
  seo: "⎔",
  "ai-visibility": "◉",
  "ai-communications": "◎",
  automation: "⎔",
  analytics: "▥",
  social: "◎",
  marketing: "◉",
  reviews: "★",
  websites: "◫",
  infrastructure: "⬡",
  opportunities: "✦",
  "command-centre": "◈",
  "partner-portal": "⇄",
  "platform-tools": "⎔",
};

export function getSidebarIcon(id: string, fallback = DEFAULT): string {
  return SIDEBAR_ICONS[id] ?? fallback;
}
