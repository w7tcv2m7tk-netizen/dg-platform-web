import Link from "next/link";
import { COMMAND_CENTRE_ROUTES } from "@dg/platform-core";

const NAV = [
  { href: COMMAND_CENTRE_ROUTES.partners, label: "Overview", id: "overview" },
  { href: COMMAND_CENTRE_ROUTES.partnerReferrals, label: "Referrals", id: "referrals" },
  { href: COMMAND_CENTRE_ROUTES.partnerCommissions, label: "Commissions", id: "commissions" },
] as const;

export function PartnersAdminNav({ active }: { active: (typeof NAV)[number]["id"] }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Partners">
      {NAV.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active === item.id
              ? "bg-sky-600 text-white"
              : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
