import Link from "next/link";

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
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-slate-300 hover:text-white"
        >
          ← DigitalGate
        </Link>
        {title ? (
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex w-full max-w-md justify-center">{children}</div>
    </div>
  );
}
