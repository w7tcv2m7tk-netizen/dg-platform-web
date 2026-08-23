import { currentUser } from "@clerk/nextjs/server";
import {
  getFinanceTemplate,
  listContacts,
  listFinanceApplications,
} from "@dg/platform-core";

import { CreateFinanceApplicationForm } from "@/components/finance/CreateFinanceApplicationForm";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { UpdateFinanceApplicationStageForm } from "@/components/finance/UpdateFinanceApplicationStageForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function FinanceApplicationsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const session = user?.id
    ? await resolveActivePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Applications</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const template = getFinanceTemplate("mortgage_broking");
  const [{ items }, contacts] = await Promise.all([
    listFinanceApplications({ organisationId: session.organisationId }),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
  ]);

  const contactOptions = contacts.items.map((c) => ({
    id: c.id,
    label:
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
      c.email ||
      c.id.slice(0, 8),
  }));

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Applications</h1>
        <p className="text-sm text-slate-400">
          {template.label} — Core CRM contacts
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <FinanceNav active="applications" />
        <div className="flex justify-end">
          <CreateFinanceApplicationForm
            contacts={contactOptions}
            stages={template.stages}
          />
        </div>
        {items.length === 0 ? (
          <div className="dg-card border-dashed border-slate-700">
            <p className="text-slate-400">No applications yet. Create the first one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{app.title}</p>
                  <p className="text-xs text-slate-500">
                    {app.status}
                    {app.lenderName ? ` · ${app.lenderName}` : ""}
                    {app.loanAmountCents != null
                      ? ` · $${(app.loanAmountCents / 100).toLocaleString("en-AU")}`
                      : ""}
                    {typeof app.metadata?.applicationType === "string"
                      ? ` · ${String(app.metadata.applicationType).replace(/_/g, " ")}`
                      : ""}
                  </p>
                </div>
                <UpdateFinanceApplicationStageForm
                  applicationId={app.id}
                  currentStage={app.stage}
                  stages={template.stages}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
