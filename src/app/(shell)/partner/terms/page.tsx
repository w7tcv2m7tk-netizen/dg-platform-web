import { redirect } from "next/navigation";

import { PartnerTermsAcceptForm } from "@/components/partners/PartnerTermsAcceptForm";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  APPROVED_PARTNER_MESSAGING,
  FOUNDING_RESELLER_PROGRAMME_NAME,
  FOUNDING_RESELLER_TERMS_VERSION,
  QUALIFYING_COMMISSION_FEES,
  RESELLER_MAY,
  RESELLER_MODEL,
  RESELLER_MODEL_LEGACY,
  RESELLER_MUST_NOT_CLAIM,
  RESELLER_NEED_NOT,
  SOLICITOR_REVIEW_NOTE,
  getPartnerByClerkUserId,
} from "@dg/platform-core";

export default async function PartnerTermsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner) redirect("/partner");

  if (partner.partnerType === "IMPLEMENTATION_PARTNER") {
    redirect("/partner/delivery");
  }

  return (
    <div className="max-w-3xl space-y-8 text-sm text-slate-300">
      <div>
        <h2 className="text-lg font-semibold text-white">{FOUNDING_RESELLER_PROGRAMME_NAME}</h2>
        <p className="mt-2">{RESELLER_MODEL}</p>
        <p className="mt-2 text-sm text-slate-400">{RESELLER_MODEL_LEGACY}</p>
        <p className="mt-2 text-slate-400">{APPROVED_PARTNER_MESSAGING.notAffiliate}</p>
      </div>

      <PartnerTermsAcceptForm
        termsAcceptedAt={partner.termsAcceptedAt}
        termsVersion={partner.termsVersion}
        currentTermsVersion={FOUNDING_RESELLER_TERMS_VERSION}
      />

      <section>
        <h3 className="mb-2 font-semibold text-white">What you do</h3>
        <ul className="list-disc space-y-1 pl-5">
          {RESELLER_MAY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-slate-400">You do not need to:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-400">
          {RESELLER_NEED_NOT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-white">What you must not claim</h3>
        <ul className="list-disc space-y-1 pl-5">
          {RESELLER_MUST_NOT_CLAIM.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-white">Qualifying fees</h3>
        <p className="mb-2 text-slate-400">
          30% is not 30% of the customer&apos;s entire invoice. It is 30% of qualifying recurring
          Platform + App revenue actually received after any founding discount.
        </p>
        <p className="font-medium text-emerald-300">Includes</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {QUALIFYING_COMMISSION_FEES.includes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 font-medium text-amber-300">Excludes</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {QUALIFYING_COMMISSION_FEES.excludes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-slate-400">
          {QUALIFYING_COMMISSION_FEES.rules.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-white">Attribution</h3>
        <p>
          A referred customer is a new paying customer introduced by you who was not already a
          DigitalGate customer, not already in an active sales opportunity, and not previously
          registered as a DigitalGate prospect. DigitalGate&apos;s CRM is the primary attribution
          record. Only one reseller is normally paid per customer. Self-referral is not
          commissionable.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-white">Status</h3>
        <p>
          Founding Reseller status is by invitation or acceptance only. It is not a franchise,
          employment, partnership, agency, exclusive territory, or a licence to represent
          DigitalGate legally. You are an independent referral partner. DigitalGate may decline,
          suspend, or terminate participation.
        </p>
      </section>

      <p className="text-xs text-slate-500">{SOLICITOR_REVIEW_NOTE}</p>
    </div>
  );
}
