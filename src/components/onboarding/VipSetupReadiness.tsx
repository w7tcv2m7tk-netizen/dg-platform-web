export function VipSetupReadiness() {
  const items = [
    ["Identity", "Business details, locations and contacts"],
    ["Brand", "Logo, icon and customer-controlled colour palette"],
    ["Operations", "Industry, sub-industry, services and workflows"],
    ["Digital presence", "Website/domain, social profiles and Google Business"],
    ["Preferences", "Appearance, timezone, locale and future currency settings"],
    ["Business Brain", "Customers, differentiators, goals, competitors and priorities"],
    ["Connections & data", "Import business contacts and prepare Google, Microsoft or Apple work accounts for contacts, calendar and mail"],
    ["Aida", "First-day context, advice priorities and launch briefing"],
  ] as const;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Before you enter the platform</p>
      <h3 className="mt-1 text-lg font-semibold text-white">Aida will prepare your workspace</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3">
            <p className="text-sm font-medium text-white/85">{title}</p>
            <p className="mt-1 text-xs leading-5 text-white/40">{detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-white/45">Existing organisations can run this setup again without deleting operational records. That gives My Venue Clean and AIM Financial the same VIP configuration path as a new customer.</p>
    </section>
  );
}
