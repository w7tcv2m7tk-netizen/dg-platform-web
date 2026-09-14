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
    <div className="dg-onboarding-experience fixed inset-0 z-[100] overflow-y-auto bg-[#07050d] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(circle at 50% -8%, color-mix(in srgb, var(--dg-product-primary) 30%, transparent), transparent 38%), radial-gradient(circle at 92% 12%, rgba(168,85,247,.10), transparent 28%), linear-gradient(180deg, #0c0716 0%, #07050d 52%, #040307 100%)",
        }}
      />

      <div className="relative flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-5 px-5 pb-3 pt-5 sm:px-8 sm:pt-6 lg:px-10">
          <div className="flex min-w-0 flex-col items-start">
            <Image
              src="/brand/logo-on-dark.png"
              alt="DigitalGate"
              width={1024}
              height={95}
              unoptimized
              priority
              className="h-auto w-[220px] object-contain object-left sm:w-[250px]"
            />
            <p className="mt-1.5 pl-[2px] text-[10px] font-medium uppercase tracking-[0.18em] text-violet-200/55 sm:text-[11px]">
              The Gateway to Your Digital World™
            </p>
          </div>
          <p className="hidden pt-2 text-xs text-white/35 sm:block">Progress saves automatically</p>
        </header>

        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-5 py-4 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center lg:gap-8 lg:px-10">
          <aside className="mx-auto flex max-w-md flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
            <div className="relative h-40 w-32 sm:h-48 sm:w-40 lg:h-60 lg:w-48">
              <Image
                src="/aida/aida-welcome.webp"
                alt="Aida, your DigitalGate AI business assistant"
                fill
                priority
                sizes="(min-width: 1024px) 192px, 160px"
                className="object-contain object-bottom drop-shadow-2xl"
              />
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
              Aida · Your AI business assistant
            </p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {aidaWelcome ?? `I’ll guide ${name} through setup and make sure your workspace opens ready for the way you operate.`}
            </p>
            {focus.length ? (
              <div className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
                {focus.slice(0, 3).map((item) => (
                  <span key={item} className="rounded-full border border-violet-300/15 bg-violet-400/[0.05] px-2.5 py-1 text-[10px] text-violet-100/65">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 self-center">
            <div className="w-full">{children}</div>
          </main>
        </div>

        <footer className="px-5 py-5 text-center text-[11px] text-white/25 sm:px-8">
          DigitalGate · Secure organisation setup
        </footer>
      </div>
    </div>
  );
}
