import { redirect } from "next/navigation";

/** Legacy Network referral route — customer Referral Programme now lives in Settings. */
export default function LegacyNetworkReferAndEarnRedirect() {
  redirect("/dashboard/settings/referrals");
}
