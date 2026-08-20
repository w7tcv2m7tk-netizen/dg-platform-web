import { redirect } from "next/navigation";

import { DeliveryPlaceholderPage } from "@/components/delivery/DeliveryPlaceholderPage";
import { DeliveryWorkspaceNav, type DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { canAccessDeliveryPartnerWorkspace, getPartnerByClerkUserId } from "@dg/platform-core";

const PAGES: Record<string, { nav: DeliveryNavId; title: string; description: string }> = {
  onboarding: {
    nav: "onboarding",
    title: "Onboarding SOP",
    description: "Standard implementation methodology — your assigned customers follow this framework.",
  },
  tasks: {
    nav: "tasks",
    title: "My Tasks",
    description: "Tasks assigned to you across implementation projects.",
  },
  customers: {
    nav: "customers",
    title: "Customers",
    description: "Customers assigned to your delivery portfolio.",
  },
  plans: {
    nav: "plans",
    title: "Implementation Plans",
    description: "Launch, Growth and Enterprise scope for your assigned customers.",
  },
  activity: {
    nav: "activity",
    title: "Activity",
    description: "Recent implementation activity on your projects.",
  },
  documents: {
    nav: "documents",
    title: "Documents",
    description: "Approved implementation documents and customer materials.",
  },
  training: {
    nav: "training",
    title: "Training",
    description: "Training requirements and schedules for your customers.",
  },
  qa: {
    nav: "qa",
    title: "QA & Go-Live",
    description: "Quality assurance and go-live readiness for your projects.",
  },
  reports: {
    nav: "reports",
    title: "Reports",
    description: "Your delivery performance and project progress.",
  },
};

export default async function PartnerDeliverySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner || !canAccessDeliveryPartnerWorkspace(partner)) redirect("/partner/dashboard");

  const { section } = await params;
  const page = PAGES[section];
  if (!page) redirect("/partner/delivery");

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-white">{page.title}</h1>
      <DeliveryWorkspaceNav active={page.nav} scope="partner" />
      <DeliveryPlaceholderPage title={page.title} description={page.description} />
    </div>
  );
}
