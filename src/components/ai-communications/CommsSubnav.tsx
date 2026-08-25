import Link from "next/link";

const LINKS = [
  { href: "/apps/communications/inbox", label: "Communications" },
  { href: "/apps/ai-communications/inbox", label: "AI Inbox" },
  { href: "/apps/ai-communications/voice", label: "Voice Agents" },
  { href: "/apps/ai-communications/call-centre", label: "Call Centre" },
  { href: "/apps/ai-communications/agents", label: "Agent Builder" },
  { href: "/apps/ai-communications/knowledge", label: "Knowledge Base" },
  { href: "/apps/ai-communications/settings", label: "AI Settings" },
] as const;

export function CommsSubnav({ active }: { active: string }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const isActive =
          link.href === active ||
          (link.href !== "/apps/ai-communications/inbox" &&
            link.href !== "/apps/communications/inbox" &&
            active.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
