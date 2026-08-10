import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getActiveServiceTemplate, listContacts } from "@dg/platform-core";

import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function ServicesCustomersPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Customers</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });
  const template = getActiveServiceTemplate(org?.settings);
  const { items, meta } = await listContacts({
    organisationId: session.organisationId,
    limit: 50,
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{template.terminology.customer}s</h1>
        <p className="mt-1 text-sm text-slate-400">
          CRM Contacts · {meta.total} — same Universal Object across Apps
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="customers" />
        <div className="dg-card">
          <p className="text-sm text-slate-400">
            <Link href="/apps/crm/contacts" className="text-sky-400 hover:underline">
              Manage in CRM →
            </Link>
          </p>
          {!items.length ? (
            <p className="mt-4 text-sm text-slate-500">No contacts yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {items.map((c) => (
                <li key={c.id} className="py-3">
                  <Link
                    href={`/apps/crm/contacts/${c.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="font-medium text-white">
                      {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-sm text-slate-400">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
