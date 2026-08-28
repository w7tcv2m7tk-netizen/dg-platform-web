import Link from "next/link";
import {
  APPROVED_PARTNER_MESSAGING,
  FOUNDING_RESELLER_ONE_LINER,
  QUALIFYING_COMMISSION_FEES,
} from "@dg/platform-core";
import { CommissionIllustrator } from "@/components/partner/CommissionIllustrator";

export default function PartnerResourcesPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-6 py-5">
        <p className="text-sm font-medium text-white">{APPROVED_PARTNER_MESSAGING.headline}</p>
        <p className="mt-2 text-sm text-slate-300">{APPROVED_PARTNER_MESSAGING.body}</p>
        <p className="mt-2 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.close}</p>
        <p className="mt-4 rounded-lg bg-slate-900/50 px-4 py-3 text-sm italic text-slate-300">
          &ldquo;{FOUNDING_RESELLER_ONE_LINER}&rdquo;
        </p>
        <Link
          href="/partner/playbook"
          className="mt-4 inline-block text-sm font-medium text-sky-400 hover:underline"
        >
          Full Founding Acquisition Partner playbook →
        </Link>
        <p className="mt-2 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.example}</p>
        <p className="mt-2 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.examplePaid}</p>
        <p className="mt-3 text-xs text-slate-500">{APPROVED_PARTNER_MESSAGING.disclaimer}</p>
        <p className="mt-2 text-xs text-slate-500">
          Do not use earnings claims such as “{APPROVED_PARTNER_MESSAGING.doNotSay}”.{" "}
          {APPROVED_PARTNER_MESSAGING.notAffiliate}
        </p>
      </div>

      <CommissionIllustrator />

      <section>
        <h2 className="mb-3 text-base font-semibold text-white">Qualifying fees</h2>
        <p className="mb-4 text-sm text-slate-400">
          Partner commission is separate from any Founding Customer discount the referred business
          receives. Commission is calculated on amounts actually paid — not list price.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Includes</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-300">
              {QUALIFYING_COMMISSION_FEES.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Excludes</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-300">
              {QUALIFYING_COMMISSION_FEES.excludes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-slate-400">
          {QUALIFYING_COMMISSION_FEES.rules.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-slate-400">
        Partners introduce. DigitalGate demonstrates and closes. If you need anything specific,{" "}
        <a href="mailto:hello@digitalgate.com.au" className="text-sky-400 hover:underline">
          contact Ben directly
        </a>
        .
      </p>

      <section>
        <h2 className="mb-4 text-base font-semibold text-white">Partner guides</h2>
        <div className="space-y-3">
          <Link
            href="/partner/playbook"
            className="block rounded-xl border border-sky-700/40 bg-sky-900/10 px-5 py-4 hover:border-sky-500/50"
          >
            <p className="font-medium text-white">Founding Acquisition Partner playbook</p>
            <p className="mt-0.5 text-sm text-slate-400">
              Your role, one-liner, journey, partner levels, good prospects, and role-play scenarios.
            </p>
          </Link>
          <Link
            href="/partner/demo"
            className="block rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4 hover:border-slate-600"
          >
            <p className="font-medium text-white">Demo environment</p>
            <p className="mt-0.5 text-sm text-slate-400">
              Explore Harbour &amp; Co (Demo) — sample data for your own learning, not for prospect demos.
            </p>
          </Link>
          <Link
            href="/partner/terms"
            className="block rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4 hover:border-slate-600"
          >
            <p className="font-medium text-white">Programme terms</p>
            <p className="mt-0.5 text-sm text-slate-400">
              What you may, need not, and must not claim — plus qualifying commission rules.
            </p>
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Industry-specific guides and email templates are coming. Use the playbook for introductions
          today.
        </p>
      </section>
    </div>
  );
}
