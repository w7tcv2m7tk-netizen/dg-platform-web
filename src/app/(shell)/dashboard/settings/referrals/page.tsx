import { redirect } from "next/navigation";

import { REFER_AND_EARN_HREF } from "@dg/platform-core";

/** Referral Programme is the customer-facing home for Refer & Earn. */
export default function SettingsReferralsRedirectPage() {
  redirect(REFER_AND_EARN_HREF);
}
