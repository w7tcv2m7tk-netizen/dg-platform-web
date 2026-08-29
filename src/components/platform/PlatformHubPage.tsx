import Link from "next/link";

export function PlatformHubPage({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links?: Array<{ href: string; label: string; detail?: string }>;
}) {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
      </header>
      <main className="dg-page-main space-y-6">
        {links && links.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-5 transition hover:border-slate-600"
              >
                <p className="font-semibold text-white">{link.label}</p>
                {link.detail ? (
                  <p className="mt-2 text-sm text-slate-400">{link.detail}</p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="dg-card border-dashed">
            <p className="text-sm text-slate-400">
              This surface is part of the DigitalGate ecosystem layer — foundations are in place;
              deeper workflows ship progressively.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
