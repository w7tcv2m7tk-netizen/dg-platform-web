import {
  APPROVED_PARTNER_MESSAGING,
  QUALIFYING_COMMISSION_FEES,
} from "@dg/platform-core";
import { CommissionIllustrator } from "@/components/partner/CommissionIllustrator";

const RESOURCES = [
  {
    section: "Platform Overview",
    items: [
      { title: "DigitalGate Platform Overview", description: "What the platform does and who it's for." },
      { title: "Founding Customer Programme", description: "The Founding 10 commercial terms and programme structure." },
      { title: "Who DigitalGate Is For", description: "Target customers, industries, and use cases." },
    ],
  },
  {
    section: "Industry Guides",
    items: [
      { title: "Real Estate", description: "How DigitalGate works for real estate agencies and agents." },
      { title: "Accommodation", description: "Hospitality businesses — short stays, property management." },
      { title: "AI Visibility", description: "The AI Visibility App and what it does for businesses." },
      { title: "Appraisal Magnet System", description: "How the Appraisal Magnet drives vendor lead generation." },
    ],
  },
  {
    section: "Referral Resources",
    items: [
      { title: "Referral Messaging", description: "How to introduce DigitalGate to a business contact." },
      { title: "Email Template", description: "A ready-to-send introduction email for warm referrals." },
      { title: "Social Post / Template", description: "Social media copy for sharing your referral link." },
      { title: "Demo environment", description: "Walk a prospect through Harbour & Co (Demo) — sample data, not a live customer." },
    ],
  },
];

export default function PartnerResourcesPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-6 py-5">
        <p className="text-sm font-medium text-white">{APPROVED_PARTNER_MESSAGING.headline}</p>
        <p className="mt-2 text-sm text-slate-300">{APPROVED_PARTNER_MESSAGING.body}</p>
        <p className="mt-2 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.close}</p>
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

      {RESOURCES.map((section) => (
        <div key={section.section}>
          <h2 className="mb-4 text-base font-semibold text-white">{section.section}</h2>
          <div className="space-y-3">
            {section.items.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4"
              >
                <p className="font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{item.description}</p>
                <p className="mt-2 text-xs text-slate-600">Coming soon — contact Ben for a copy.</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
