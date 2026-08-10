import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getActiveServiceTemplate, listQuotes } from "@dg/platform-core";

import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function ServicesQuotesPage() {
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
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
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
  const quotes = await listQuotes(session.organisationId, 40);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{template.terminology.quote}s</h1>
        <p className="mt-1 text-sm text-slate-400">
          Powered by Commerce Core — create & send from Commerce
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="quotes" />
        <div className="dg-card">
          <p className="text-sm text-slate-400">
            Services quotes are Commerce documents (`sourceApp` can be services).{" "}
            <Link href="/apps/commerce/quotes" className="text-sky-400 hover:underline">
              Open Commerce quotes →
            </Link>
          </p>
          {!quotes.length ? (
            <p className="mt-4 text-sm text-slate-500">No quotes yet for this organisation.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {quotes.map((q) => (
                <li key={q.id} className="py-3">
                  <Link
                    href={`/apps/commerce/quotes/${q.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="font-medium text-white">
                      {q.quoteNumber ?? q.id.slice(0, 8)} · {q.status}
                    </p>
                    <p className="text-sm text-slate-400">
                      {new Date(q.createdAt).toLocaleDateString("en-AU")}
                      {q.totalCents != null
                        ? ` · ${new Intl.NumberFormat("en-AU", {
                            style: "currency",
                            currency: q.currency || "AUD",
                          }).format(q.totalCents / 100)}`
                        : ""}
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
