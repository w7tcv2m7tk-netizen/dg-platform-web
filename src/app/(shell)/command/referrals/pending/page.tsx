import { redirect } from "next/navigation";

/** Compatibility route: referral workflow is canonical at /command/referrals. */
export default function PendingReferralsRedirectPage() {
  redirect("/command/referrals");
}
