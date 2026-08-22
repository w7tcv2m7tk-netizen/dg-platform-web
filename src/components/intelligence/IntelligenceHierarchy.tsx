import Link from "next/link";

const ITEMS = [
  {
    label: "Digital Twin",
    question: "What does DigitalGate currently know?",
    href: "/dashboard/twin",
  },
  {
    label: "Business Brain",
    question: "What does DigitalGate understand about my business?",
    href: "/dashboard/brain",
  },
  {
    label: "Business Health",
    question: "How healthy is my business?",
    href: "/dashboard/health",
  },
  {
    label: "Benchmarks",
    question: "How do we compare?",
    href: "/dashboard/benchmarks",
  },
  {
    label: "Insights",
    question: "What is DigitalGate noticing?",
    href: "/dashboard/insights",
  },
  {
    label: "AI Advisor",
    question: "What should we do?",
    href: "/dashboard/advisor",
  },
  {
    label: "Reports",
    question: "What do we need to communicate or export?",
    href: "/dashboard/reports",
  },
  {
    label: "Command Centre",
    question: "What needs to happen next?",
    href: "/dashboard",
  },
] as const;

export type IntelligenceHierarchyActive =
  | "twin"
  | "brain"
  | "health"
  | "benchmarks"
  | "insights"
  | "advisor"
  | "reports"
  | "command";

const ACTIVE_MAP: Record<IntelligenceHierarchyActive, string> = {
  twin: "Digital Twin",
  brain: "Business Brain",
  health: "Business Health",
  benchmarks: "Benchmarks",
  insights: "Insights",
  advisor: "AI Advisor",
  reports: "Reports",
  command: "Command Centre",
};

export function IntelligenceHierarchy({
  active,
}: {
  active?: IntelligenceHierarchyActive;
}) {
  const activeLabel = active ? ACTIVE_MAP[active] : null;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Intelligence hierarchy
      </p>
      <ul className="mt-3 space-y-2">
        {ITEMS.map((item) => {
          const isActive = item.label === activeLabel;
          return (
            <li key={item.label} className="text-sm">
              {isActive ? (
                <span className="font-medium text-white">
                  {item.label}
                  <span className="font-normal text-slate-400"> → {item.question}</span>
                </span>
              ) : (
                <Link href={item.href} className="text-slate-400 hover:text-sky-300">
                  <span className="text-slate-300">{item.label}</span>
                  <span> → {item.question}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
        Analytics → What do the numbers show?{" "}
        <Link href="/apps/analytics" className="text-sky-400 hover:underline">
          Open Analytics
        </Link>
      </p>
    </div>
  );
}
