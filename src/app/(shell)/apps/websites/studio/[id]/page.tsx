import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getWebsite,
  listOrganisationDomains,
  organisationHasWebsitesBuilder,
  resolvePrimaryLinkedDomain,
} from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { WebsiteStudioClient } from "@/components/websites/WebsiteStudioClient";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

type Props = { params: Promise<{ id: string }> };

export default async function WebsiteStudioPage({ params }: Props) {
  const { id } = await params;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Websites</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">
            Enable <code>websites.builder</code> to edit a site.{" "}
            <Link href="/apps/websites" className="underline">
              Back to Websites
            </Link>
          </p>
        </main>
      </>
    );
  }

  const website = await getWebsite(session.organisationId, id);
  if (!website) notFound();

  const domains = await listOrganisationDomains(session.organisationId);
  const linkedDomain =
    resolvePrimaryLinkedDomain(website, domains)?.name ?? null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{website.name}</h1>
        <p className="text-sm text-slate-400">
          Design Studio · Websites · {session.organisationName}
          {linkedDomain ? ` · ${linkedDomain}` : ""}
        </p>
      </header>
      <main className="dg-page-main">
        <WebsitesSubnav active="websites" />
        <Suspense
          fallback={
            <p className="text-sm text-slate-500">Loading studio…</p>
          }
        >
          <WebsiteStudioClient
            initial={website}
            linkedDomain={linkedDomain}
          />
        </Suspense>
      </main>
    </>
  );
}
