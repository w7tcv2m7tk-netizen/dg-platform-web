import { currentUser } from "@clerk/nextjs/server";
import { listPmProperties } from "@dg/platform-core";

import { CreatePmPropertyForm } from "@/components/property-management/CreatePmPropertyForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function PmPropertiesPage() {
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
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listPmProperties(session.organisationId);

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-400">Rental portfolio register</p>
        <CreatePmPropertyForm />
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">No properties yet. Add the first rental property.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="font-medium text-white">{p.name}</p>
              <p className="text-xs text-slate-500">
                {p.addressLine1}, {p.suburb} {p.state} {p.postcode}
                {p.propertyType ? ` · ${p.propertyType}` : ""} · {p.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
