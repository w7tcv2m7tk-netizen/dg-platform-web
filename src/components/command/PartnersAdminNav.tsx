import Link from "next/link";
import { COMMAND_CENTRE_ROUTES } from "@dg/platform-core";

/**
 * Partners = people & organisations (relationship management).
 * Referrals / Commissions / Payouts live under Platform → Network (transactions).
 * Prefer AppContextNav from sidebar routes; this list is a fallback for legacy pages.
 */
const NAV = [
  { href: COMMAND_CENTRE_ROUTES.partners, label: "Dashboard", id: "dashboard" },
  { href: COMMAND_CENTRE_ROUTES.partnerEcosystem, label: "Ecosystem", id: "ecosystem" },
  { href: COMMAND_CENTRE_ROUTES.partnerBriefing, label: "Briefing", id: "briefing" },
  { href: COMMAND_CENTRE_ROUTES.partnerResellers, label: "Acquisition Partners", id: "resellers" },
  { href: COMMAND_CENTRE_ROUTES.partnerOnboarding, label: "Onboarding", id: "onboarding" },
  { href: COMMAND_CENTRE_ROUTES.partnerDelivery, label: "Operating Model", id: "operating-model" },
] as const;

/**
 * @deprecated AppContextNav owns section tabs. Do not mount this bar on section hubs.
 */
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
