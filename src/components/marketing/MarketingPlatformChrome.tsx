import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";

const NAV = [
  { id: "overview", label: "Overview", active: false },
  { id: "crm", label: "CRM", active: false },
  { id: "vendor-pipeline", label: "Vendor leads", active: false },
  { id: "website-health", label: "Website Health", active: false },
  { id: "ai-visibility", label: "AI Visibility", active: false },
];

export function MarketingPlatformChrome({
  children,
  activeNav,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  activeNav?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-56 shrink-0 border-r border-slate-800 bg-slate-950 p-4 lg:block">
        <DigitalGateLogo variant="lockup" href="#" iconSize={22} logoWidth={96} showTagline />
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                activeNav === item.id
                  ? "bg-blue-600/20 text-blue-200"
                  : "text-slate-400"
              }`}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-800 px-6 py-5">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
