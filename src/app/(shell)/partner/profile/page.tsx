import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getPartnerByClerkUserId } from "@dg/platform-core";
import { CopyButton } from "@/components/partner/CopyButton";

export default async function PartnerProfilePage() {
  const { clerkUserId, name, email } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner) redirect("/partner");

  return (
    <div className="max-w-2xl space-y-8">
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
        <div className="divide-y divide-slate-700/40">
          <ProfileRow label="Name" value={partner.displayName ?? name} />
          <ProfileRow label="Business" value={partner.businessName ?? "—"} />
          <ProfileRow label="Email" value={partner.email ?? email} />
          <ProfileRow label="Phone" value={partner.phone ?? "—"} />
          <ProfileRow label="Partner Tier" value={partner.partnerTypeLabel} />
          <ProfileRow
            label="Commission Rate"
            value={`${partner.commissionPercent}% for ${partner.commissionDurationMonths} months per referred customer`}
          />
          <ProfileRow label="Referral Code" value={partner.referralCode} mono />
          <ProfileRow
            label="Joined"
            value={partner.joinedAt ? new Date(partner.joinedAt).toLocaleDateString("en-AU") : "Pending"}
          />
        </div>
      </div>

      {/* Referral link copy panel */}
      <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-6 py-5">
        <p className="mb-2 text-sm font-semibold text-white">Your Referral Link</p>
        <p className="mb-4 text-sm text-slate-300">
          Share this link with businesses you're introducing to DigitalGate. Applications submitted
          via your link are automatically attributed to you.
        </p>
        <div className="flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3">
          <span className="flex-1 break-all font-mono text-sm text-slate-300">
            {partner.referralUrl}
          </span>
          <CopyButton text={partner.referralUrl} />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        To update your name, email or other details, contact{" "}
        <a href="mailto:hello@digitalgate.com.au" className="text-sky-400 hover:underline">
          hello@digitalgate.com.au
        </a>.
      </p>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-4 px-5 py-4">
      <span className="w-40 shrink-0 text-sm text-slate-400">{label}</span>
      <span className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
