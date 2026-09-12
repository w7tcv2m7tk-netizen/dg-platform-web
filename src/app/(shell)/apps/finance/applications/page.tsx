import {
  getFinanceTemplate,
  listContacts,
  listFinanceApplications,
} from "@dg/platform-core";

import { CreateFinanceApplicationForm } from "@/components/finance/CreateFinanceApplicationForm";
import { UpdateFinanceApplicationStageForm } from "@/components/finance/UpdateFinanceApplicationStageForm";
import { canManageFinance } from "@/lib/finance-page-access";
import { formatMoneyFromCents, getOrganisationMoneySettings } from "@/lib/organisation-money";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function FinanceApplicationsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const template = getFinanceTemplate("mortgage_broking");
  const [{ items }, contacts, money] = await Promise.all([
    listFinanceApplications({ organisationId: session.organisationId }),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
    getOrganisationMoneySettings(session.organisationId),
  ]);
  const canManage = canManageFinance(session);

  const contactOptions = contacts.items.map((c) => ({
    id: c.id,
    label:
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
      c.email ||
      c.id.slice(0, 8),
  }));

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · {template.label} · Core CRM contacts
          </p>
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only access. An organisation owner/admin or explicit Finance editor can change applications.
            </p>
          ) : null}
        </div>
        {canManage ? (
          <CreateFinanceApplicationForm
            contacts={contactOptions}
            stages={template.stages}
            currency={money.currency}
          />
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            {canManage ? "No applications yet. Create the first one." : "No applications yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((app) => {
            const amount = formatMoneyFromCents(app.loanAmountCents, money);
            return (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{app.title}</p>
                  <p className="text-xs text-slate-500">
                    {app.status}
                    {app.lenderName ? ` · ${app.lenderName}` : ""}
                    {amount ? ` · ${amount}` : ""}
                    {typeof app.metadata?.applicationType === "string"
                      ? ` · ${String(app.metadata.applicationType).replace(/_/g, " ")}`
                      : ""}
                  </p>
                </div>
                {canManage ? (
                  <UpdateFinanceApplicationStageForm
                    applicationId={app.id}
                    currentStage={app.stage}
                    stages={template.stages}
                  />
                ) : (
                  <span className="rounded-full border border-slate-700 px-3 py-2 text-xs capitalize text-slate-400">
                    {app.stage.replace(/_/g, " ")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
