import type { ReactNode } from "react";

export function VipOnboardingExperience({ children }: { children: ReactNode; businessName?: string | null; aidaWelcome?: string | null; setupFocus?: string[] }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#07050d] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(circle at 50% -8%, color-mix(in srgb, var(--dg-product-primary, #7c3aed) 34%, transparent), transparent 38%), radial-gradient(circle at 92% 12%, rgba(168,85,247,.12), transparent 28%), linear-gradient(180deg, #0c0716 0%, #07050d 52%, #040307 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-300/10 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-300/80">DigitalGate</p>
            <p className="mt-1 text-sm font-medium text-white/70">Private Business Operations Platform setup</p>
          </div>
          <div className="rounded-full border border-violet-400/20 bg-violet-400/[0.06] px-4 py-2 text-xs text-white/55">
            Progress is saved automatically
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 py-6 sm:py-8">{children}</main>

        <footer className="border-t border-violet-300/10 py-5 text-center text-xs text-white/30">
          DigitalGate · Secure organisation setup
        </footer>
      </div>
    </div>
  );
}
