import Link from "next/link";

/**
 * @deprecated AppContextNav owns Communications tabs. Do not mount page-level AI nav.
 * Kept as a no-op export so any stale imports fail closed without duplicate chrome.
 */
export function AiConversationsSubnav(_props: { active: string }) {
  return null;
}

/** @deprecated Prefer AppContextNav — Communications → Settings. */
export const AI_CONVERSATIONS_SETTINGS_HREF = "/apps/ai-communications/settings";

export function AiConversationsSettingsLink({
  className = "text-sm text-sky-400 hover:underline",
}: {
  className?: string;
}) {
  return (
    <Link href={AI_CONVERSATIONS_SETTINGS_HREF} className={className}>
      Communications settings →
    </Link>
  );
}
