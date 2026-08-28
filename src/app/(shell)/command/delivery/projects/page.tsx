import Link from "next/link";
import { redirect } from "next/navigation";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { listDeliveryProjects } from "@dg/platform-core";

function healthLabel(health: string): string {
  if (health === "on_track") return "🟢 On track";
  if (health === "at_risk") return "🟠 At risk";
  if (health === "blocked") return "🔴 Blocked";
  return health.replace(/_/g, " ");
}

export default async function StaffDeliveryProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ health?: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const { health } = await searchParams;

  let projects: Awaited<ReturnType<typeof listDeliveryProjects>> = [];
  try {
    projects = await listDeliveryProjects({ managerView: true, limit: 100 });
  } catch {
    /* not migrated */
  }

  if (health) {
    projects = projects.filter((p) => p.health === health);
  }

  return (
    <DeliveryCommandPage
      title="Implementation Projects"
      description="Customer implementation containers across DigitalGate Delivery — each project follows the 16-stage Implementation Lifecycle™."
      navActive="projects"
    >
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
          No implementation projects yet. Projects are created when a customer enters
          implementation.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-700/20">
                  <td className="px-4 py-3 font-medium text-white">
                    <Link
                      href={`/command/delivery/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.customerName}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {project.referenceCode}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{project.statusLabel}</td>
                  <td className="px-4 py-3 text-slate-400">{project.ownerName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{healthLabel(project.health)}</td>
                  <td className="px-4 py-3 text-slate-300">{project.progressPercent}%</td>
                  <td className="max-w-[14rem] truncate px-4 py-3 text-slate-400">
                    {project.nextAction ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DeliveryCommandPage>
  );
}
