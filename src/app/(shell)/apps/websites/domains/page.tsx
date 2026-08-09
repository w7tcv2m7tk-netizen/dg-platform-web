import { redirect } from "next/navigation";

/** Domains live under Infrastructure — keep this path as a bookmark redirect. */
export default function WebsitesDomainsPage() {
  redirect("/apps/infrastructure/domains");
}
