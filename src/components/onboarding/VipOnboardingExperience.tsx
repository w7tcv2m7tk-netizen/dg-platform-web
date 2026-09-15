import Image from "next/image";
import type { ReactNode } from "react";

export function VipOnboardingExperience({
  children,
}: {
  businessName?: string | null;
  aidaWelcome?: string | null;
  setupFocus?: string[];
  children: ReactNode;
}) {
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
        <div
          aria-hidden="true"
          className="shrink-0 sm:hidden"
          style={{ height: "max(3.25rem, env(safe-area-inset-top))" }}
        />
        <header className="flex items-center justify-center px-4 pb-2 pt-0 sm:px-4 sm:py-3 lg:px-5">
          <div className="flex flex-col items-center">
            <Image
              src="/brand/logo-on-dark.png"
              alt="DigitalGate"
              width={1024}
              height={95}
              unoptimized
              priority
              className="h-auto w-[165px] object-contain sm:w-[205px]"
            />
            <p className="mt-2 text-center text-[9px] font-medium uppercase leading-none tracking-[0.15em] text-violet-200/55 sm:mt-1 sm:text-[10px] sm:leading-normal sm:tracking-[0.18em]">
              Business Operating Platform
            </p>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-3 sm:px-8 sm:py-6 lg:px-12">
          <div className="w-full">{children}</div>
        </main>

        <footer className="px-5 py-3 text-center text-[11px] text-white/25 sm:px-8 sm:py-5">
          DigitalGate · Secure organisation setup
        </footer>
      </div>
    </div>
  );
}
