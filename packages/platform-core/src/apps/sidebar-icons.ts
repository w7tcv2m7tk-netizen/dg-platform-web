/** Geometric sidebar glyphs — keep in sync with shell nav (◉ ▦). */
const DEFAULT = "◈";

const SIDEBAR_ICONS: Record<string, string> = {
  // Apps
  crm: "◎",
  commerce: "▤",
  "real-estate": "⌂",
  accommodation: "◫",
  finance: "▣",
  services: "⬡",
  creator: "◈",
  commercial: "▦",
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
  "command-centre": "◈",
  // Settings & tools groups
  "platform-settings": "◈",
  "platform-tools": "⎔",
};

export function getSidebarIcon(id: string, fallback = DEFAULT): string {
  return SIDEBAR_ICONS[id] ?? fallback;
}
