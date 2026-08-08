import Link from "next/link";

const LINKS = [
  { href: "/apps/reviews", label: "Overview" },
  { href: "/apps/reviews/inbox", label: "Inbox" },
  { href: "/apps/reviews/sources", label: "Sources" },
  { href: "/apps/reviews/requests", label: "Requests" },
  { href: "/apps/reviews/reputation", label: "Reputation" },
] as const;

export function ReviewsSubnav({ active }: { active: (typeof LINKS)[number]["href"] }) {
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
    </nav>
  );
}
