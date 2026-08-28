import { redirect } from "next/navigation";
import { getPartnerByClerkUserId, grantDemoAccess } from "@dg/platform-core";
import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PartnerDemoEntryPage() {
  const { clerkUserId, email, name } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner || (partner.status !== "active" && partner.status !== "pending")) {
    redirect("/partner");
  }

  const { organisationId } = await grantDemoAccess({
    clerkUserId,
    email,
    displayName: name,
    access: "partner",
  });
  await writeActiveOrganisationId(organisationId);
  redirect("/dashboard");
}
