import {
  APPROVED_PARTNER_MESSAGING,
  FOUNDING_RESELLER_PROGRAMME_NAME,
} from "@dg/platform-core";

/** Approved public copy for /founding-customers — not an affiliate pitch. */
export function FoundingResellerPublicCopy() {
  return (
    <section
      className="mx-auto max-w-3xl px-6 py-14 text-slate-200"
      style={{ background: "#0A0E17" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
        {FOUNDING_RESELLER_PROGRAMME_NAME}
      </p>
      <h2 className="mt-3 text-2xl font-bold text-white">{APPROVED_PARTNER_MESSAGING.headline}</h2>
      <p className="mt-4 text-slate-300">{APPROVED_PARTNER_MESSAGING.body}</p>
      <p className="mt-4 text-slate-300">{APPROVED_PARTNER_MESSAGING.close}</p>
      <p className="mt-4 text-slate-400">{APPROVED_PARTNER_MESSAGING.example}</p>
      <p className="mt-2 text-slate-400">{APPROVED_PARTNER_MESSAGING.examplePaid}</p>
      <p className="mt-4 text-xs text-slate-500">{APPROVED_PARTNER_MESSAGING.disclaimer}</p>
    </section>
  );
}
