import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-950 px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <DigitalGateLogo
          variant="icon"
          href="/"
          iconSize={80}
          className="mb-5 drop-shadow-lg"
        />
        {title ? (
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        ) : null}
        {subtitle ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-200">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex w-full max-w-md justify-center">{children}</div>
      <p className="mt-8 max-w-sm text-center text-sm leading-relaxed text-slate-400">
        Need help signing in?{" "}
        <a
          href="https://digitalgate.com.au/contact/"
          className="font-medium text-blue-300 hover:text-white"
        >
          Contact support
        </a>{" "}
        ·{" "}
        <a href="tel:+61405227227" className="font-medium text-blue-300 hover:text-white">
          0405 227 227
        </a>{" "}
        ·{" "}
        <a
          href="mailto:hello@digitalgate.com.au"
          className="font-medium text-blue-300 hover:text-white"
        >
          hello@digitalgate.com.au
        </a>
      </p>
    </div>
  );
}
