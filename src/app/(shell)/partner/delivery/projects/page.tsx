import Link from "next/link";
import { redirect } from "next/navigation";

import {
  canAccessDeliveryPartnerWorkspace,
  getPartnerByClerkUserId,
  isDeliveryManager,
  listDeliveryProjects,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PartnerDeliveryProjectsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner || !canAccessDeliveryPartnerWorkspace(partner)) redirect("/partner/dashboard");

  const managerView = isDeliveryManager(partner);
  let projects: Awaited<ReturnType<typeof listDeliveryProjects>> = [];
  try {
    projects = await listDeliveryProjects({ partnerId: partner.id, managerView, limit: 100 });
  } catch {
    /* not migrated */
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Implementation Projects</h1>
      <p className="text-sm text-slate-400">
        Assigned implementation containers — each follows the 16-stage Implementation Lifecycle™.
      </p>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
          No projects assigned yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700/60">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-700/40">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3">
                    <Link href={`/partner/delivery/projects/${project.id}`} className="font-medium text-white hover:underline">
                      {project.customerName}
                    </Link>
                    <p className="text-xs text-slate-500">{project.referenceCode} · {project.progressPercent}%</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
