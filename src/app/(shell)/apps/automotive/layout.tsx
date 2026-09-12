import { redirect } from "next/navigation";
import { platformApps } from "@dg/platform-core/apps/registry";

export default function AutomotiveLayout({ children }: { children: React.ReactNode }) {
  if (!platformApps.get("automotive")?.enabled) {
    redirect("/dashboard/apps#apps");
  }

  return children;
}
