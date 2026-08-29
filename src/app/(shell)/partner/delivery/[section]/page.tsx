import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerOnboardingWorkflow } from "@/components/command/PartnerEcosystemContent";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import type { DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  canAccessDeliveryPartnerWorkspace,
  getDeliveryDashboardMetrics,
  getPartnerByClerkUserId,
  isDeliveryManager,
  listDeliveryProjects,
  listDeliveryTasks,
  type DeliveryProjectRecord,
} from "@dg/platform-core";

const STATUS_FILTERS: Record<string, string[]> = {
  training: ["training"],
  qa: ["qa", "go_live", "testing"],
};

const SECTION_META: Record<
  string,
  { nav: DeliveryNavId; title: string; description: string }
> = {
  onboarding: {
    nav: "plans",
    title: "Implementation Plans",
    description:
      "Redirected — onboarding is the early phase of the Implementation Lifecycle™.",
  },
  tasks: {
    nav: "tasks",
    title: "My Tasks",
    description: "Open implementation tasks on your projects.",
  },
  customers: {
    nav: "customers",
    title: "Customers",
    description: "Customers in your delivery portfolio.",
  },
  plans: {
    nav: "plans",
    title: "Implementation Plans",
    description:
      "Standard 16-stage implementation framework and Launch / Growth / Enterprise plan packages.",
  },
  activity: {
    nav: "activity",
    title: "Activity",
    description: "Recent implementation activity on your projects.",
  },
  documents: {
    nav: "documents",
    title: "Documents",
    description: "SOPs and materials live on projects and Platform Docs — no separate vault yet.",
  },
  training: {
    nav: "training",
    title: "Training",
    description: "Projects currently in training.",
  },
  qa: {
    nav: "qa",
    title: "QA & Go-Live",
    description: "Projects in QA, testing or go-live.",
  },
  reports: {
    nav: "reports",
    title: "Reports",
    description: "Your delivery performance and project progress.",
  },
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
              href={`/partner/delivery/projects/${p.id}`}
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
        No separate {title.toLowerCase()} store yet — work lives on implementation projects.
      </p>
    </div>
  );
}

export default async function PartnerDeliverySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner || !canAccessDeliveryPartnerWorkspace(partner)) redirect("/partner/dashboard");

  const { section } = await params;
  if (section === "onboarding") redirect("/partner/delivery/plans");
  const page = SECTION_META[section];
  if (!page) redirect("/partner/delivery");

  const managerView = isDeliveryManager(partner);

  let projects: DeliveryProjectRecord[] = [];
  let metrics: Awaited<ReturnType<typeof getDeliveryDashboardMetrics>> | null = null;
  let tasks: Awaited<ReturnType<typeof listDeliveryTasks>> = [];

  try {
    [projects, metrics, tasks] = await Promise.all([
      listDeliveryProjects({ partnerId: partner.id, managerView, limit: 100 }),
      getDeliveryDashboardMetrics({ partnerId: partner.id, managerView }),
      listDeliveryTasks({ partnerId: partner.id, managerView }),
    ]);
  } catch {
    /* tables not migrated */
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{page.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{page.description}</p>
      </div>
      {section === "plans" ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold text-white">
              DigitalGate Implementation Lifecycle™
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Early acceptance through business setup is the onboarding phase within
              implementation — not a separate Delivery area.
            </p>
          </div>
          <CustomerOnboardingWorkflow />
          <HonestHub
            title="Plan packages"
            description="Launch, Growth and Enterprise scope — live on each project record."
            links={[
              { href: "/partner/delivery/projects", label: "Your projects" },
              { href: "/partner/resources", label: "Partner resources" },
            ]}
          />
        </div>
      ) : null}

      {section === "tasks" ? (
        tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
            No open delivery tasks assigned to you.
            {projects.length > 0 ? (
              <>
                {" "}
                <Link href="/partner/delivery/projects" className="text-sky-400 hover:underline">
                  View your projects
                </Link>
                .
              </>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  task.overdue
                    ? "border-rose-700/40 bg-rose-900/10"
                    : "border-slate-700/60 bg-slate-800/40"
                }`}
              >
                <Link
                  href={`/partner/delivery/projects/${task.projectId}`}
                  className="font-medium text-white hover:underline"
                >
                  {task.title}
                </Link>
                <p className="mt-1 text-slate-400">
                  {task.customerName} · {task.projectReference}
                  {task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString("en-AU")}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {section === "customers" ? (
        <>
          <OperatorMetricStrip
            metrics={[
              { label: "Implementation projects", value: projects.length, tone: "sky" },
              {
                label: "Blocked",
                value: projects.filter((p) => p.health === "blocked").length,
                tone: "amber",
              },
            ]}
          />
          <ProjectList
            projects={projects}
            empty="No customers assigned yet — DigitalGate will allocate projects to you."
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
              { label: "All projects", value: projects.length },
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
            <Link href="/partner/delivery/projects" className="text-sky-400 hover:underline">
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
              { label: "Active implementations", value: metrics.activeImplementations },
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
            <Link href="/partner/delivery" className="text-sky-400 hover:underline">
              Delivery home
            </Link>
          </p>
        </>
      ) : null}

      {section === "reports" && !metrics ? (
        <p className="text-sm text-slate-500">
          Delivery metrics unavailable — database or migrations may be missing.
        </p>
      ) : null}

      {section === "activity" ? (
        <>
          <OperatorMetricStrip
            metrics={[
              { label: "Open tasks", value: tasks.length },
              {
                label: "Recently updated projects",
                value: Math.min(projects.length, 10),
              },
              {
                label: "Overdue tasks",
                value: tasks.filter((t) => t.overdue).length,
                tone: tasks.some((t) => t.overdue) ? "amber" : "default",
              },
            ]}
          />
          {tasks.filter((t) => t.overdue).length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-white">Overdue tasks</h2>
              <ul className="divide-y divide-slate-800 rounded-xl border border-rose-900/40">
                {tasks
                  .filter((t) => t.overdue)
                  .slice(0, 10)
                  .map((task) => (
                    <li key={task.id} className="px-4 py-3 text-sm">
                      <Link
                        href={`/partner/delivery/projects/${task.projectId}`}
                        className="text-sky-400 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <p className="mt-0.5 text-slate-500">
                        {task.customerName}
                        {task.dueAt
                          ? ` · was due ${new Date(task.dueAt).toLocaleDateString("en-AU")}`
                          : ""}
                      </p>
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

      {section === "documents" ? (
        <HonestHub
          title="Documents"
          description="Implementation materials live on project records and under Implementation Plans. A shared document vault is not available yet."
          links={[
            { href: "/partner/delivery/plans", label: "Implementation Plans" },
            { href: "/partner/delivery/projects", label: "Projects" },
          ]}
        />
      ) : null}
    </div>
  );
}
