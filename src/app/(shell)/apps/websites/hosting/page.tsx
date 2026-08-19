import { redirect } from "next/navigation";

/** Hosting lives under Infrastructure — keep this path as a bookmark redirect. */
export default function WebsitesHostingPage() {
  redirect("/apps/infrastructure/hosting");
}
