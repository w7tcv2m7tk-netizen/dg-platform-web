import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  ACQUISITION_PORTAL_HREF,
  canAccessDeliveryPartnerWorkspace,
  DELIVERY_PARTNER_PORTAL_HREF,
  getPartnerByClerkUserId,
} from "@dg/platform-core";

export default async function PartnerIndexPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (partner && canAccessDeliveryPartnerWorkspace(partner)) {
    redirect(DELIVERY_PARTNER_PORTAL_HREF);
  }

  redirect(ACQUISITION_PORTAL_HREF);
}
