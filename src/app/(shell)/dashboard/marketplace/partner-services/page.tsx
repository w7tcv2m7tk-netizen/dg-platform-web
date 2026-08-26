import { redirect } from "next/navigation";

export default function MarketplacePartnerServicesPage() {
  redirect("/dashboard/marketplace?category=partners");
}
