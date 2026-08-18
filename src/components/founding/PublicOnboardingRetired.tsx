import Link from "next/link";

/** Replaces the retired public 12-section WP onboarding form. */
export function PublicOnboardingRetired() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
        Founding Customer setup
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white">
        Onboarding now lives in DigitalGate
      </h1>
      <p className="mt-4 text-slate-300">
        The old public 12-section form is retired. After you&apos;re accepted as a
        Founding 10 customer, DigitalGate takes you through agreement, guided
        onboarding, an implementation plan, then go-live — signed in, not as a
        giant website questionnaire.
      </p>
      <p className="mt-4 text-slate-400">
        Applying is still the public Founding Customer form. Configuring the
        business happens in the app.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="https://app.digitalgate.com.au/founding/setup"
          className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Continue in the app →
        </Link>
        <Link
          href="/founding-customers/"
          className="rounded-full border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white hover:border-sky-400"
        >
          Apply for Founding 10
        </Link>
      </div>
    </div>
  );
}

export function isRetiredPublicOnboarding(siteSlug: string, pageSlug?: string): boolean {
  const site = siteSlug.toLowerCase();
  const page = (pageSlug || "").toLowerCase();
  return page === "onboarding" && (site === "digitalgate" || site.startsWith("digitalgate"));
}
