import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCommandCentreDeliveryAlerts,
  getDeliveryDashboardMetrics,
  listDeliveryProjects,
  listDeliveryTasks,
  type DeliveryProjectRecord,
} from "@dg/platform-core";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import type { DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const STATUS_FILTERS: Record<string, string[]> = {
  training: ["training"],
  qa: ["qa", "go_live", "testing"],
};

function ProjectList({
  projects,
  empty,
}: {
  projects: DeliveryProjectRecord[];
  empty: string;
}) {
  if (projects.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
      {projects.map((p) => (
        <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div>
            <Link
              href={`/command/delivery/projects/${p.id}`}
              className="font-medium text-white hover:text-sky-300"
            >
              {p.customerName}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              {p.referenceCode} · {p.statusLabel} · {p.progressPercent}% · {p.health}
            </p>
            {p.nextAction ? (
              <p className="mt-1 text-sm text-slate-400">{p.nextAction}</p>
            ) : null}
          </div>
          <Link
            href={`/command/clients/${p.customerOrganisationId}`}
            className="text-xs text-sky-400 hover:underline"
          >
            Org →
          </Link>
        </li>
      ))}
    </ul>
  );
}

function HonestHub({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
      <p className="text-sm text-slate-400">{description}</p>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sky-400 hover:underline">
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        No separate {title.toLowerCase()} store yet — work lives on implementation projects and
        Platform Docs.
      </p>
    </div>
  );
}

export default async function StaffDeliverySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const { section } = await params;

  const navId = (["customers", "plans", "team", "activity", "documents", "training", "qa", "reports"].includes(
    section,
  )
    ? section
    : null) as DeliveryNavId | null;
  if (!navId) redirect("/command/delivery");

  let projects: DeliveryProjectRecord[] = [];
  let metrics = null as Awaited<ReturnType<typeof getDeliveryDashboardMetrics>> | null;
  let alerts = null as Awaited<ReturnType<typeof getCommandCentreDeliveryAlerts>> | null;
  let tasks = null as Awaited<ReturnType<typeof listDeliveryTasks>> | null;

  try {
    [projects, metrics, alerts, tasks] = await Promise.all([
      listDeliveryProjects({ managerView: true, limit: 100 }),
      getDeliveryDashboardMetrics({ managerView: true }),
      getCommandCentreDeliveryAlerts(),
      listDeliveryTasks({ managerView: true }),
    ]);
  } catch {
    /* tables not migrated */
  }

  const titles: Record<string, string> = {
    customers: "Delivery Customers",
    plans: "Implementation Plans",
    team: "Delivery Team",
    activity: "Delivery Activity",
    documents: "Implementation Documents",
    training: "Training",
    qa: "QA & Go-Live",
    reports: "Delivery Reports",
  };

  return (
    <DeliveryCommandPage title={titles[section]} navActive={navId}>
      {section === "customers" ? (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: "Implementation projects",
                value: projects.length,
                tone: "sky",
              },
              {
                label: "Blocked",
                value: projects.filter((p) => p.health === "blocked").length,
                tone: "amber",
              },
            ]}
          />
          <ProjectList
            projects={projects}
            empty="No delivery projects yet — accept a Founding customer to create one."
          />
        </>
      ) : null}

      {section === "training" || section === "qa" ? (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: section === "training" ? "In training" : "QA / go-live",
                value: projects.filter((p) =>
                  (STATUS_FILTERS[section] ?? []).includes(p.status),
                ).length,
                tone: "sky",
              },
              {
                label: "All projects",
                value: projects.length,
              },
            ]}
          />
          <ProjectList
            projects={projects.filter((p) =>
              (STATUS_FILTERS[section] ?? []).includes(p.status),
            )}
            empty={`No projects currently in ${section === "training" ? "training" : "QA / go-live"}.`}
          />
          <p className="text-sm text-slate-500">
            All projects:{" "}
            <Link href="/command/delivery/projects" className="text-sky-400 hover:underline">
              Implementation projects
            </Link>
          </p>
        </>
      ) : null}

      {section === "reports" && metrics ? (
        <>
          <OperatorMetricStrip
            columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
            metrics={[
              {
                label: "Active implementations",
                value: metrics.activeImplementations,
              },
              { label: "On track", value: metrics.onTrack, tone: "emerald" },
              { label: "At risk", value: metrics.atRisk, tone: "amber" },
              { label: "Blocked", value: metrics.blocked, tone: "amber" },
              { label: "Go-lives this month", value: metrics.goLivesThisMonth },
              { label: "Overdue tasks", value: metrics.overdueTasks },
              {
                label: "Awaiting customer info",
                value: metrics.customersAwaitingInformation,
              },
              {
                label: "Avg impl. days",
                value: metrics.averageImplementationDays ?? "—",
              },
            ]}
          />
          <p className="text-sm text-slate-500">
            Live dashboard:{" "}
            <Link href="/command/delivery" className="text-sky-400 hover:underline">
              Delivery home
            </Link>
          </p>
        </>
      ) : null}

      {section === "activity" ? (
        <>
          <OperatorMetricStrip
            metrics={[
              {
                label: "Open alerts",
                value: alerts?.length ?? 0,
                tone: alerts?.length ? "amber" : "default",
              },
              {
                label: "Open tasks",
                value: tasks?.length ?? 0,
              },
              {
                label: "Recently updated projects",
                value: Math.min(projects.length, 10),
              },
            ]}
          />
          {alerts && alerts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">Delivery alerts</h2>
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
                {alerts.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <Link href={a.href} className="text-sky-400 hover:underline">
                      {a.message}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Recently updated</h2>
            <ProjectList
              projects={[...projects]
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                )
                .slice(0, 15)}
              empty="No project activity yet."
            />
          </section>
        </>
      ) : null}

      {section === "plans" ? (
        <div className="space-y-10">
          <div>
            <h2 className="text-base font-semibold text-white">
              DigitalGate Implementation Lifecycle™
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Standard 16-stage implementation framework — every customer follows this lifecycle.
              Early acceptance and kick-off also live under{" "}
              <Link href="/command/delivery/onboarding" className="text-sky-400 hover:underline">
                Onboarding
              </Link>
              .
            </p>
          </div>
          <HonestHub
            title="Plan packages"
            description="Launch, Growth and Enterprise scoping templates live on each implementation project (plan field). Use projects and partner docs — not a separate plan CMS."
            links={[
              { href: "/command/delivery/projects", label: "Implementation projects" },
              { href: "/command/delivery/onboarding", label: "Customer onboarding" },
              {
                href: "/command/docs/delivery-operating-model",
                label: "Delivery operating model",
              },
              { href: "/command/partners/delivery", label: "Partner delivery model" },
            ]}
          />
        </div>
      ) : null}

      {section === "team" ? (
        <HonestHub
          title="Team"
          description="Allocate work via Delivery Partners on each project (owner / delivery lead). Invite partners from invitations."
          links={[
            { href: "/command/delivery/invitations", label: "Invite delivery partners" },
            { href: "/command/delivery/tasks", label: "My / open tasks" },
            { href: "/command/partners", label: "Partners directory" },
          ]}
        />
      ) : null}

      {section === "documents" ? (
        <HonestHub
          title="Documents"
          description="SOPs and implementation materials live in Platform Docs and on project records — no separate document vault yet."
          links={[
            { href: "/command/docs", label: "Platform Docs" },
            { href: "/command/docs/delivery-operating-model", label: "Delivery operating model" },
            { href: "/command/delivery/plans", label: "Implementation Lifecycle" },
            { href: "/command/delivery/projects", label: "Projects" },
          ]}
        />
      ) : null}

      {section === "reports" && !metrics ? (
        <p className="text-sm text-slate-500">
          Delivery metrics unavailable — database or migrations may be missing.
        </p>
      ) : null}
    </DeliveryCommandPage>
  );
}
