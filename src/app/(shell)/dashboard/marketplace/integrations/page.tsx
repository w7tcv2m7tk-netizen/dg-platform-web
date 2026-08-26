import { redirect } from "next/navigation";

export default function MarketplaceIntegrationsPage() {
  redirect("/dashboard/marketplace?category=integrations");
}
