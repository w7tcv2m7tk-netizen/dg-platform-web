import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession } from "@dg/platform-core";

import { AppFeaturePlaceholder } from "@/components/platform/AppFeaturePlaceholder";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
}

async function CommandOverviewPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name: user.fullName ?? email,
      })
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Command Centre</h1>
        <p className="text-sm text-slate-400">
          Internal OS for DigitalGate{session ? ` · ${session.organisationName}` : ""}
        </p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/command/growth-engine" className="dg-card block hover:border-blue-500/40">
            <p className="text-xs uppercase tracking-wide text-blue-400">Growth Engine™</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Acquisition pipeline</h2>
            <p className="mt-2 text-sm text-slate-400">
              Discover businesses, run AI audits, send reports, convert to clients.
            </p>
          </Link>
          <Link href="/command/clients" className="dg-card block hover:border-slate-600">
            <h2 className="font-semibold text-white">Client intelligence</h2>
            <p className="mt-2 text-sm text-slate-400">Per-tenant scores, usage, and success metrics.</p>
          </Link>
          <Link href="/command/platform-health" className="dg-card block hover:border-slate-600">
            <h2 className="font-semibold text-white">Platform health</h2>
            <p className="mt-2 text-sm text-slate-400">Infrastructure, API, and AI usage.</p>
          </Link>
          <Link href="/command/revenue" className="dg-card block hover:border-slate-600">
            <h2 className="font-semibold text-white">Revenue</h2>
            <p className="mt-2 text-sm text-slate-400">MRR, ARR, churn, and trials.</p>
          </Link>
          <Link href="/command/reports" className="dg-card block hover:border-slate-600">
            <h2 className="font-semibold text-white">Executive dashboard</h2>
            <p className="mt-2 text-sm text-slate-400">Growth reports and agency rankings.</p>
          </Link>
          <Link href="/command/support" className="dg-card block hover:border-slate-600">
            <h2 className="font-semibold text-white">Support centre</h2>
            <p className="mt-2 text-sm text-slate-400">Cross-tenant support context.</p>
          </Link>
        </div>
      </main>
    </>
  );
}

export default async function CommandPage({ params }: PageProps) {
  const { segments } = await params;

  if (!segments?.length) {
    return <CommandOverviewPage />;
  }

  const href = `/command/${segments.join("/")}`;
  return <AppFeaturePlaceholder href={href} />;
}
