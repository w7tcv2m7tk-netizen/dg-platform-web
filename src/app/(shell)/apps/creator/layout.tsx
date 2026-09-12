import { redirect } from "next/navigation";
import { platformApps } from "@dg/platform-core/apps/registry";

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  if (!platformApps.get("creator")?.enabled) {
    redirect("/dashboard/apps#apps");
  }

  return children;
}
