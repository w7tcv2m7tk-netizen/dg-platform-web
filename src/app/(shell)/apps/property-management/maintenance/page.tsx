import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  listContacts,
  listPmMaintenance,
  listPmProperties,
} from "@dg/platform-core";

import { CreatePmMaintenanceForm } from "@/components/property-management/CreatePmMaintenanceForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function PmMaintenancePage() {
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
          <h1 className="text-2xl font-bold text-white">Maintenance</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const [{ items }, properties, contacts] = await Promise.all([
    listPmMaintenance(session.organisationId),
    listPmProperties(session.organisationId),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
  ]);

  const propertyLabel = new Map(
    properties.items.map((p) => [p.id, `${p.name} — ${p.suburb}`]),
  );

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/property-management"
          className="text-sm text-sky-400 hover:underline"
        >
          ← Property Management
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Maintenance</h1>
            <p className="text-sm text-slate-400">Requests linked to rental properties</p>
          </div>
          <CreatePmMaintenanceForm
            properties={properties.items.map((p) => ({
              id: p.id,
              label: `${p.name} — ${p.suburb}`,
            }))}
            contacts={contacts.items.map((c) => ({
              id: c.id,
              label:
                [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
                c.email ||
                c.id.slice(0, 8),
            }))}
          />
        </div>
      </header>
      <main className="dg-page-main space-y-4">
        {items.length === 0 ? (
          <div className="dg-card border-dashed border-slate-700">
            <p className="text-slate-400">No maintenance requests yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <p className="font-medium text-white">{r.title}</p>
                <p className="text-xs text-slate-500">
                  {r.status} · {r.priority}
                  {r.propertyId && propertyLabel.has(r.propertyId)
                    ? ` · ${propertyLabel.get(r.propertyId)}`
                    : ""}
                </p>
                {r.notes ? (
                  <p className="mt-1 text-sm text-slate-400">{r.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
