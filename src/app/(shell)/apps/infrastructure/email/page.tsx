import { getEmailInfrastructureOverview } from "@dg/platform-core";
import Link from "next/link";

/**
 * Email Infrastructure — honest overview (no fake mailbox console).
 * @see docs/foundations/EMAIL-INFRASTRUCTURE.md
 */
export default async function EmailInfrastructurePage() {
  const overview = await getEmailInfrastructureOverview();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Email</h1>
        <p className="text-sm text-slate-400">
          Infrastructure service · transactional + mailbox orchestration (not a
          mail server)
        </p>
      </header>
      <main className="dg-page-main max-w-2xl space-y-6">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-50">
          DigitalGate orchestrates Resend (send) and Dreamscape (mailboxes later).
          Playbook:{" "}
          <code className="text-sky-200">{overview.docsPath}</code>
        </div>

        <section className="grid gap-3 sm:grid-cols-1">
          <PlaneCard
            title="Platform transactional"
            ok={overview.platform.configured}
            body={overview.platform.message}
          />
          <PlaneCard
            title="Tenant transactional"
            ok={overview.tenantTransactional.configured}
            body={overview.tenantTransactional.message}
          />
          <PlaneCard
            title="Business mailbox"
            ok={overview.mailbox.configured}
            body={overview.mailbox.message}
          />
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Capabilities</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
            <li>
              <span className="text-slate-200">Transactional</span> — notifications,
              receipts, CRM follow-ups via Communications → Resend
            </li>
            <li>
              <span className="text-slate-200">Deliverability</span> — SPF / DKIM /
              DMARC planned via Domains DNS (E1)
            </li>
            <li>
              <span className="text-slate-200">Business email</span> — mailbox
              provision stub (Dreamscape) — not customer-ready
            </li>
            <li>
              <span className="text-slate-200">Marketing ESP</span> — out of scope
              until unsubscribe + suppressions ship
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-2">
          <h2 className="text-lg font-semibold text-white">Next steps</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-400">
            {overview.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <p className="text-sm text-slate-500">
          Domain + hosting DNS:{" "}
          <Link
            href="/apps/infrastructure/domains"
            className="text-sky-400 hover:underline"
          >
            Domains
          </Link>
          . Checked {new Date(overview.checkedAt).toLocaleString("en-AU")}.
        </p>
      </main>
    </>
  );
}

function PlaneCard({
  title,
  ok,
  body,
}: {
  title: string;
  ok: boolean;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-white">{title}</h2>
        <span
          className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            ok
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {ok ? "Ready" : "Pending"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  );
}
