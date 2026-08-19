import { redirect } from "next/navigation";
import { grantDemoAccess } from "@dg/platform-core";
import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { getPlatformPageContext } from "@/lib/platform-page-context";

/** Enter the shared DigitalGate demo organisation. */
export default async function EnterDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { clerkUserId, email, name } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login?next=/demo");

  const { from } = await searchParams;
  const access = from === "partner" ? "partner" : "customer";

  const { organisationId } = await grantDemoAccess({
    clerkUserId,
    email,
    displayName: name,
    access,
  });
  await writeActiveOrganisationId(organisationId);
  redirect("/dashboard");
}
