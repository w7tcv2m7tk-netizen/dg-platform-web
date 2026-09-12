import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";

export default function SignupPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center px-4 sm:px-6">
          <DigitalGateLogo
            variant="stacked"
            href="/"
            iconSize={44}
            logoWidth={132}
            showTagline={false}
          />
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">{children}</div>
    </div>
  );
}
