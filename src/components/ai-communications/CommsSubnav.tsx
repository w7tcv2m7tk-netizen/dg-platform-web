import Link from "next/link";

const LINKS = [
  { href: "/apps/ai-communications/inbox", label: "Inbox" },
  { href: "/apps/ai-communications/knowledge", label: "Knowledge" },
  { href: "/apps/ai-communications/settings", label: "Settings" },
] as const;

export function CommsSubnav({ active }: { active: (typeof LINKS)[number]["href"] }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const isActive = link.href === active;
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
      <span className="self-center px-2 text-xs text-slate-600">
        Voice · Agents · Call centre — planned
      </span>
    </nav>
  );
}
