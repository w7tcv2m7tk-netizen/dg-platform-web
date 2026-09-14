import Image from "next/image";
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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#07050d] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(circle at 50% -8%, color-mix(in srgb, var(--dg-product-primary, #7c3aed) 34%, transparent), transparent 38%), radial-gradient(circle at 92% 12%, rgba(168,85,247,.12), transparent 28%), linear-gradient(180deg, #0c0716 0%, #07050d 52%, #040307 100%)",
        }}
      />

      <div className="relative mx-auto min-h-screen max-w-5xl px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <Image
              src="/brand/logo-on-dark.png"
              alt="DigitalGate"
              width={1024}
              height={95}
              unoptimized
              priority
              className="h-auto w-[220px] object-contain sm:w-[250px]"
            />
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-violet-200/65 sm:text-[11px]">
              The Gateway to Your Digital World™
            </p>
            <p className="mt-1.5 text-sm font-medium text-white/70">Private Business Operations Platform setup</p>
          </div>
          <div className="rounded-full border border-violet-400/20 bg-violet-400/[0.06] px-4 py-2 text-xs text-white/55">
            Progress is saved automatically
          </div>
        </header>

        <section className="mx-auto flex max-w-3xl flex-col items-center pb-5 pt-8 text-center sm:pt-10">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28">
            <Image
              src="/aida/aida-welcome.webp"
              alt="Aida, your DigitalGate AI business assistant"
              fill
              priority
              sizes="112px"
              className="object-contain object-bottom drop-shadow-2xl"
            />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
            Aida · Your AI business assistant
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Let&apos;s set up {name}.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
            {aidaWelcome ?? `I’ll guide you through the essentials, personalise DigitalGate around ${name}, and build the context I need to help from day one.`}
          </p>

          {focus.length ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {focus.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-violet-300/20 bg-violet-400/[0.06] px-3 py-1.5 text-xs text-violet-100/75"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <main className="mx-auto min-w-0 max-w-4xl pb-10">{children}</main>

        <footer className="border-t border-violet-300/10 py-5 text-center text-xs text-white/30">
          DigitalGate · Secure organisation setup
        </footer>
      </div>
    </div>
  );
}
