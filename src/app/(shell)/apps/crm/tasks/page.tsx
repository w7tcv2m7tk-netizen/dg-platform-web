import Link from "next/link";
import {
  getContactsByIds,
  getOrganisationById,
  listCompanies,
  listOpportunities,
  listTasks,
  sessionHasFeature,
} from "@dg/platform-core";

import { CreateTaskForm } from "@/components/crm/CreateTaskForm";
import { TasksList, type TaskListItem } from "@/components/crm/TasksList";
import { dateKeyInTimeZone, safeTimeZone } from "@/lib/organisation-timezone";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

async function loadTaskOpportunities(organisationId: string, ids: Set<string>) {
  if (!ids.size) return [];

  const matched: Awaited<ReturnType<typeof listOpportunities>>["items"] = [];
  let offset = 0;
  let total = 0;

  do {
    const page = await listOpportunities({ organisationId, limit: 100, offset });
    total = page.meta.total;
    for (const opportunity of page.items) {
      if (ids.has(opportunity.id)) matched.push(opportunity);
    }
    offset += page.meta.limit;
  } while (matched.length < ids.size && offset < total && offset < 1000);

  return matched;
}

async function loadTaskCompanies(organisationId: string, ids: Set<string>) {
  if (!ids.size) return [];

  const matched: Awaited<ReturnType<typeof listCompanies>>["items"] = [];
  let offset = 0;
  let total = 0;

  do {
    const page = await listCompanies({ organisationId, limit: 100, offset });
    total = page.meta.total;
    for (const company of page.items) {
      if (ids.has(company.id)) matched.push(company);
    }
    offset += page.meta.limit;
  } while (matched.length < ids.size && offset < total && offset < 1000);

  return matched;
}

async function hydrateTaskRelations(
  tasks: TaskListItem[],
  session: Awaited<ReturnType<typeof getAuthorisedPlatformPageSession>>,
): Promise<TaskListItem[]> {
  if (!session || tasks.length === 0) return tasks;

  const canReadContacts = sessionHasFeature(session, "crm.contacts.read");
  const canReadCompanies = sessionHasFeature(session, "crm.companies.read");
  const canReadOpportunities = sessionHasFeature(session, "crm.opportunities.read");

  const directContactIds = new Set(
    canReadContacts
      ? tasks
          .filter((task) => task.entityType === "Contact" && task.entityId)
          .map((task) => task.entityId as string)
      : [],
  );
  const directCompanyIds = new Set(
    canReadCompanies
      ? tasks
          .filter((task) => task.entityType === "Company" && task.entityId)
          .map((task) => task.entityId as string)
      : [],
  );
  const opportunityIds = new Set(
    canReadOpportunities
      ? tasks
          .filter((task) => task.entityType === "Opportunity" && task.entityId)
          .map((task) => task.entityId as string)
      : [],
  );

  const opportunities = canReadOpportunities
    ? await loadTaskOpportunities(session.organisationId, opportunityIds)
    : [];

  if (canReadContacts) {
    for (const opportunity of opportunities) {
      if (opportunity.contactId) directContactIds.add(opportunity.contactId);
    }
  }

  const contacts = canReadContacts
    ? (
        await Promise.all(
          chunks([...directContactIds], 50).map((ids) =>
            getContactsByIds(session.organisationId, ids),
          ),
        )
      ).flat()
    : [];
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));

  const companyIds = new Set(directCompanyIds);
  if (canReadCompanies) {
    for (const opportunity of opportunities) {
      if (opportunity.companyId) companyIds.add(opportunity.companyId);
      if (opportunity.contactId) {
        const contact = contactMap.get(opportunity.contactId);
        if (contact?.companyId) companyIds.add(contact.companyId);
      }
    }
    for (const contact of contacts) {
      if (contact.companyId) companyIds.add(contact.companyId);
    }
  }

  const companies = canReadCompanies
    ? await loadTaskCompanies(session.organisationId, companyIds)
    : [];
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const opportunityMap = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));

  return tasks.map((task) => {
    if (!task.entityId || !task.entityType) return task;

    if (task.entityType === "Contact" && canReadContacts) {
      const contact = contactMap.get(task.entityId);
      if (!contact) return task;
      const name =
        [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
        contact.email ||
        contact.phone ||
        "Contact";
      const business =
        canReadCompanies && contact.companyId ? companyMap.get(contact.companyId)?.name ?? null : null;
      return {
        ...task,
        relatedKind: "Customer",
        relatedName: name,
        relatedBusiness: business,
        relatedHref: `/apps/crm/contacts/${contact.id}`,
      };
    }

    if (task.entityType === "Opportunity" && canReadOpportunities) {
      const opportunity = opportunityMap.get(task.entityId);
      if (!opportunity) return task;
      const contact =
        canReadContacts && opportunity.contactId ? contactMap.get(opportunity.contactId) ?? null : null;
      const contactName = contact
        ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
          contact.email ||
          contact.phone ||
          null
        : null;
      const companyId = opportunity.companyId ?? contact?.companyId ?? null;
      const business =
        canReadCompanies && companyId ? companyMap.get(companyId)?.name ?? null : null;

      return {
        ...task,
        relatedKind: contactName ? "Customer" : business ? "Business" : "Opportunity",
        relatedName: contactName ?? business ?? opportunity.title,
        relatedBusiness: contactName && business ? business : null,
        relatedHref: `/apps/crm/opportunities/${opportunity.id}`,
      };
    }

    if (task.entityType === "Company" && canReadCompanies) {
      const company = companyMap.get(task.entityId);
      if (!company) return task;
      return {
        ...task,
        relatedKind: "Business",
        relatedName: company.name,
        relatedBusiness: null,
        relatedHref: `/apps/crm/companies/${company.id}`,
      };
    }

    return task;
  });
}

export default async function CrmTasksPage() {
  const session = await getAuthorisedPlatformPageSession("crm.tasks.read");

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Sign in to view tasks.</p>
          </div>
        </main>
      </>
    );
  }

  const canWrite = sessionHasFeature(session, "crm.tasks.write");
  const [organisation, openResult, completedResult] = await Promise.all([
    getOrganisationById(session.organisationId),
    listTasks({
      organisationId: session.organisationId,
      status: "open",
      limit: 100,
    }),
    listTasks({
      organisationId: session.organisationId,
      status: "completed",
      limit: 50,
    }),
  ]);
  const displayTimeZone = safeTimeZone(organisation?.timezone);

  const [openTasks, completedTasks] = await Promise.all([
    hydrateTaskRelations(openResult.items as TaskListItem[], session),
    hydrateTaskRelations(completedResult.items as TaskListItem[], session),
  ]);

  const now = Date.now();
  const todayKey = dateKeyInTimeZone(new Date(), displayTimeZone);
  const overdue = openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now);
  const today = openTasks.filter((task) => {
    if (!task.dueAt) return false;
    return dateKeyInTimeZone(task.dueAt, displayTimeZone) === todayKey && new Date(task.dueAt).getTime() >= now;
  });
  const upcoming = openTasks.filter((task) => {
    if (!task.dueAt) return false;
    return dateKeyInTimeZone(task.dueAt, displayTimeZone) > todayKey;
  });
  const unscheduled = openTasks.filter((task) => !task.dueAt);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/contacts" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Tasks</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {openResult.meta.total} open ·{" "}
          {completedResult.meta.total} completed
        </p>
        <p className="mt-1 text-xs text-slate-500">Times shown in {displayTimeZone}.</p>
      </header>
      <main className="dg-page-main space-y-8">
        {canWrite ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Create task</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add enough detail that the next action is obvious when you return to it.
            </p>
            <div className="mt-4">
              <CreateTaskForm />
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="dg-card border-amber-900/50">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Overdue</h2>
              <span className="text-sm text-amber-400">{overdue.length}</span>
            </div>
            <TasksList tasks={overdue} timeZone={displayTimeZone} canWrite={canWrite} emptyLabel="Nothing overdue." />
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Today</h2>
              <span className="text-sm text-slate-400">{today.length}</span>
            </div>
            <TasksList tasks={today} timeZone={displayTimeZone} canWrite={canWrite} emptyLabel="Nothing else due today." />
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Upcoming</h2>
              <span className="text-sm text-slate-400">{upcoming.length}</span>
            </div>
            <TasksList tasks={upcoming} timeZone={displayTimeZone} canWrite={canWrite} emptyLabel="No upcoming tasks." />
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">No due date</h2>
              <span className="text-sm text-slate-400">{unscheduled.length}</span>
            </div>
            <TasksList
              tasks={unscheduled}
              timeZone={displayTimeZone}
              canWrite={canWrite}
              emptyLabel="Every open task has a due date."
            />
          </div>
        </section>

        <section className="dg-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Completed</h2>
            <span className="text-sm text-slate-400">{completedTasks.length}</span>
          </div>
          <TasksList tasks={completedTasks} timeZone={displayTimeZone} canWrite={canWrite} emptyLabel="No completed tasks yet." />
        </section>
      </main>
    </>
  );
}
