import { redirect } from "next/navigation";

import { REFER_AND_EARN_HREF } from "@dg/platform-core";

/** @deprecated Refer & Earn lives under Network */
export default function SettingsReferralsRedirectPage() {
  redirect(REFER_AND_EARN_HREF);
}
