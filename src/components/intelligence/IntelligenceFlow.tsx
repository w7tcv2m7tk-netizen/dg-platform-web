import Link from "next/link";

const FLOW = [
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

export function IntelligenceFlow({ active = "AI Advisor" }: { active?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Intelligence flow
      </p>
      <ol className="mt-3 space-y-3">
        {FLOW.map((step, index) => {
          const isActive = step.label === active;
          return (
            <li key={step.label} className="relative pl-0">
              {index > 0 ? (
                <span className="mb-2 block text-center text-slate-600 sm:text-left" aria-hidden>
                  ↓
                </span>
              ) : null}
              {isActive ? (
                <div>
                  <p className="font-medium text-violet-200">{step.label}</p>
                  <p className="text-sm text-slate-400">{step.question}</p>
                </div>
              ) : (
                <Link href={step.href} className="block hover:text-sky-300">
                  <p className="font-medium text-slate-300">{step.label}</p>
                  <p className="text-sm text-slate-500">{step.question}</p>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
        Analytics ({` `}
        <Link href="/apps/analytics" className="text-sky-400 hover:underline">
          Growth App
        </Link>
        ) answers: What do the numbers show?
      </p>
    </div>
  );
}
