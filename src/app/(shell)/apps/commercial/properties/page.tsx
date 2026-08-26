import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listCommercialProperties } from "@dg/platform-core";

import { CreateCommercialPropertyForm } from "@/components/commercial/CreateCommercialPropertyForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function CommercialPropertiesPage() {
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
          <h1 className="text-2xl font-bold text-white">Properties</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const { items } = await listCommercialProperties(session.organisationId);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/commercial" className="text-sm text-sky-400 hover:underline">
          ← Commercial Property
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Properties</h1>
            <p className="text-sm text-slate-400">
              Commercial asset register — separate from Real Estate sales
            </p>
          </div>
          <CreateCommercialPropertyForm />
        </div>
      </header>
      <main className="dg-page-main space-y-4">
        {items.length === 0 ? (
          <div className="dg-card border-dashed border-slate-700">
            <p className="text-slate-400">No commercial properties yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.addressLine1}, {p.suburb} {p.state} {p.postcode}
                  {p.propertyType ? ` · ${p.propertyType}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
