import { redirect } from "next/navigation";

export default function MarketplaceAppsPage() {
  redirect("/dashboard/marketplace?category=apps");
}
