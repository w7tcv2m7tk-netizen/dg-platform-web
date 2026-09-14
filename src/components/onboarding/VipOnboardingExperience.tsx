import type { ReactNode } from "react";

export function VipOnboardingExperience({
  businessName,
  aidaWelcome,
  setupFocus,
  children,
}: {
  businessName?: string | null;
  aidaWelcome?: string | null;
  setupFocus?: string[];
  children: ReactNode;
}) {
  const name = businessName?.trim() || "your business";
  const focus = setupFocus?.filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#05070b] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--org-primary, #3b82f6) 22%, transparent), transparent 34%), radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--org-accent, #10b981) 16%, transparent), transparent 30%), linear-gradient(180deg, #070a10 0%, #05070b 62%, #030406 100%)",
        }}
      />

      <div className="relative mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
              DigitalGate Business Operations Platform
            </p>
            <p className="mt-1 text-sm font-medium text-white/80">Private platform setup</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/55">
            Your progress is saved automatically
          </div>
        </header>

        <section className="grid gap-8 py-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12 lg:py-12">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="max-w-md">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40">
                <span className="text-xl font-semibold tracking-tight">A</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--org-primary,#60a5fa)]">
                Aida · Your AI business assistant
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Welcome to DigitalGate.
              </h1>
              <p className="mt-5 text-base leading-7 text-white/65">
                Hi. I’m Aida. {aidaWelcome ?? `I’ll help prepare ${name} before you enter your Business Operations Platform.`}
              </p>
              <p className="mt-4 text-sm leading-6 text-white/50">
                We’ll configure your identity, brand, industry, services, website, business preferences and the context I need to give you useful advice from day one.
              </p>

              {focus.length ? (
                <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Your initial Business Brain focus</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {focus.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-8 space-y-3 text-sm text-white/60">
                {["Business identity & brand", "Industry-specific workspace", "Website, social & customer channels", "Business Brain & Aida context", "Platform preferences & launch readiness"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] text-white/55">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.045] p-1 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[24px] bg-[#090d14]/90 p-1 sm:p-3">{children}</div>
          </main>
        </section>

        <footer className="border-t border-white/[0.07] py-6 text-center text-xs text-white/35">
          DigitalGate Business Operations Platform · Secure organisation setup
        </footer>
      </div>
    </div>
  );
}
