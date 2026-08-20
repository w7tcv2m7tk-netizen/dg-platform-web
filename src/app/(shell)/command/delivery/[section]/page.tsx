import { redirect } from "next/navigation";

import { DeliveryPlaceholderPage } from "@/components/delivery/DeliveryPlaceholderPage";
import { DeliveryWorkspaceNav, type DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const PAGES: Record<
  string,
  { nav: DeliveryNavId; title: string; description: string }
> = {
  customers: {
    nav: "customers",
    title: "Delivery Customers",
    description: "Customers with active implementation projects — linked from accepted Founding Customers.",
  },
  plans: {
    nav: "plans",
    title: "Implementation Plans",
    description: "Launch, Growth and Enterprise scoping templates for internal pricing.",
  },
  team: {
    nav: "team",
    title: "Delivery Team",
    description: "Allocate work to Delivery Partners and outsourced delivery capacity.",
  },
  activity: {
    nav: "activity",
    title: "Delivery Activity",
    description: "Implementation activity feed across all projects.",
  },
  documents: {
    nav: "documents",
    title: "Implementation Documents",
    description: "SOPs, discovery notes, migration plans and customer-facing materials.",
  },
  training: {
    nav: "training",
    title: "Training",
    description: "Staff training schedules and completion tracking per implementation.",
  },
  qa: {
    nav: "qa",
    title: "QA & Go-Live",
    description: "Quality assurance checklists and go-live readiness reviews.",
  },
  reports: {
    nav: "reports",
    title: "Delivery Reports",
    description: "Implementation velocity, average time-to-live and capacity planning.",
  },
};

export default async function StaffDeliverySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const { section } = await params;
  const page = PAGES[section];
  if (!page) redirect("/command/delivery");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">{page.title}</h1>
      </header>
      <DeliveryWorkspaceNav active={page.nav} scope="staff" />
      <DeliveryPlaceholderPage title={page.title} description={page.description} />
    </div>
  );
}
