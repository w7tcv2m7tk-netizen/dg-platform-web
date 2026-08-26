import Link from "next/link";

import { redirect } from "next/navigation";



import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";

import { getPlatformPageContext } from "@/lib/platform-page-context";

import { listDeliveryProjects } from "@dg/platform-core";



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

      title="Active Projects"

      description="Customer implementation records across DigitalGate Delivery."

      navActive="projects"

    >

      {projects.length === 0 ? (

        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">

          No implementation projects yet.

        </div>

      ) : (

        <div className="overflow-hidden rounded-xl border border-slate-700/60">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b border-slate-700/60 text-left text-xs uppercase tracking-wider text-slate-500">

                <th className="px-4 py-3">Customer</th>

                <th className="px-4 py-3">Reference</th>

                <th className="px-4 py-3">Plan</th>

                <th className="px-4 py-3">Stage</th>

                <th className="px-4 py-3">Health</th>

                <th className="px-4 py-3">Owner</th>

                <th className="px-4 py-3">Progress</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-700/40">

              {projects.map((project) => (

                <tr key={project.id} className="hover:bg-slate-700/20">

                  <td className="px-4 py-3 font-medium text-white">

                    <Link href={`/command/delivery/projects/${project.id}`} className="hover:underline">

                      {project.customerName}

                    </Link>

                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{project.referenceCode}</td>

                  <td className="px-4 py-3 text-slate-300">{project.planLabel}</td>

                  <td className="px-4 py-3 text-slate-300">{project.statusLabel}</td>

                  <td className="px-4 py-3 capitalize text-slate-300">{project.health.replace("_", " ")}</td>

                  <td className="px-4 py-3 text-slate-400">{project.ownerName ?? "—"}</td>

                  <td className="px-4 py-3 text-slate-300">{project.progressPercent}%</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </DeliveryCommandPage>

  );

}

