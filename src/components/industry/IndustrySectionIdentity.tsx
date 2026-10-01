"use client";

import { usePathname } from "next/navigation";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";

const LABELS: Record<string, string> = {
  bookings: "Bookings", calendar: "Calendar", "check-ins": "Check-ins", guests: "Guests",
  housekeeping: "Housekeeping", payments: "Payments", reviews: "Reviews", units: "Units",
  applications: "Applications", clients: "Clients", integrations: "Integrations", pipeline: "Pipeline",
  customers: "Customers", jobs: "Jobs", quotes: "Quotes", scheduling: "Scheduling", teams: "Teams",
  properties: "Properties", leases: "Leases", maintenance: "Maintenance", owners: "Owners", tenants: "Tenants",
  listings: "Listings", settlements: "Settlements", "buyer-leads": "Buyer Leads", "vendor-leads": "Vendor Leads",
  "vendor-prospecting": "Vendor Prospecting", "test-drives": "Test Drives", inventory: "Inventory", leads: "Leads",
  content: "Content", memberships: "Memberships", storefront: "Storefront",
};

export function IndustrySectionIdentity({
  mount,
  appName,
}: {
  mount: string;
  appName: string;
}) {
  const pathname = usePathname();
  const root = `/apps/${mount}`;
  if (pathname === root || !pathname.startsWith(`${root}/`)) return null;

  const segment = pathname.slice(root.length + 1).split("/")[0] ?? "";
  const title = LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <SectionPageHeader section={appName} title={title} />;
}
