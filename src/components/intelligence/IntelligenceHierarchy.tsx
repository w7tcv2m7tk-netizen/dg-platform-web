import Link from "next/link";

const ITEMS = [
  {
    label: "Business Health",
    question: "How healthy is my business?",
    href: "/dashboard/health",
    active: false,
  },
  {
    label: "Benchmarks",
    question: "How am I performing compared with others?",
    href: "/dashboard/benchmarks",
    active: false,
  },
  {
    label: "Insights",
    question: "What is happening and why?",
    href: "/dashboard/reports",
    active: false,
  },
  {
    label: "AI Advisor",
    question: "What should I do about it?",
    href: "/dashboard/advisor",
    active: false,
  },
  {
    label: "Business Brain",
    question: "What does DigitalGate know about my business?",
    href: "/dashboard/brain",
    active: false,
  },
  {
    label: "Command Centre",
    question: "What needs to happen next?",
    href: "/dashboard",
    active: false,
  },
] as const;

export type IntelligenceHierarchyActive =
  | "health"
  | "benchmarks"
  | "insights"
  | "advisor"
  | "brain"
  | "command";

const ACTIVE_MAP: Record<IntelligenceHierarchyActive, string> = {
  health: "Business Health",
  benchmarks: "Benchmarks",
  insights: "Insights",
  advisor: "AI Advisor",
  brain: "Business Brain",
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
    </div>
  );
}
