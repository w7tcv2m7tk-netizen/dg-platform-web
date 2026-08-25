import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  canAccessDeliveryPartnerWorkspace,
  getPartnerByClerkUserId,
} from "@dg/platform-core";

export default async function PartnerIndexPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (partner && canAccessDeliveryPartnerWorkspace(partner)) {
    redirect("/partner/delivery");
  }

  redirect("/partner/dashboard");
}
