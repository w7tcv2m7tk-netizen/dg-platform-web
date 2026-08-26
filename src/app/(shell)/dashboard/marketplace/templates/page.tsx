import { redirect } from "next/navigation";

export default function MarketplaceTemplatesPage() {
  redirect("/dashboard/marketplace?category=apps");
}
