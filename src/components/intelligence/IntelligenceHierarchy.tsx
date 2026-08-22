import Link from "next/link";

import {
  ANALYTICS_RELATED,
  INTELLIGENCE_ACTION,
  INTELLIGENCE_ACTIVE_LABEL,
  INTELLIGENCE_ANALYSIS,
  INTELLIGENCE_FOUNDATION,
  INTELLIGENCE_OUTPUT,
  type IntelligenceHierarchyActive,
} from "./intelligence-model";

export type { IntelligenceHierarchyActive };

function HierarchyItem({
  label,
  question,
  href,
  isActive,
  indent,
}: {
  label: string;
  question: string;
  href: string;
  isActive: boolean;
  indent?: boolean;
}) {
  const className = indent ? "pl-3 border-l border-slate-800" : "";
  if (isActive) {
    return (
      <li className={`text-sm ${className}`}>
        <span className="font-medium text-white">
          {label}
          <span className="font-normal text-slate-400"> → {question}</span>
        </span>
      </li>
    );
  }
  return (
    <li className={`text-sm ${className}`}>
      <Link href={href} className="text-slate-400 hover:text-sky-300">
        <span className="text-slate-300">{label}</span>
        <span> → {question}</span>
      </Link>
    </li>
  );
}

export function IntelligenceHierarchy({
  active,
}: {
  active?: IntelligenceHierarchyActive;
}) {
  const activeLabel = active ? INTELLIGENCE_ACTIVE_LABEL[active] : null;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Intelligence hierarchy
      </p>
      <ul className="mt-3 space-y-2">
        {INTELLIGENCE_FOUNDATION.map((item) => (
          <HierarchyItem
            key={item.id}
            label={item.label}
            question={item.question}
            href={item.href}
            isActive={item.label === activeLabel}
          />
        ))}

        <li className="pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Intelligence
          </p>
          <ul className="mt-2 space-y-2">
            {INTELLIGENCE_ANALYSIS.map((item) => (
              <HierarchyItem
                key={item.id}
                label={item.label}
                question={item.question}
                href={item.href}
                isActive={item.label === activeLabel}
                indent
              />
            ))}
          </ul>
        </li>

        {INTELLIGENCE_ACTION.map((item) => (
          <HierarchyItem
            key={item.id}
            label={item.label}
            question={item.question}
            href={item.href}
            isActive={item.label === activeLabel}
          />
        ))}

        <li className="pt-1 pl-3 text-xs text-slate-600">↘ output</li>
        <HierarchyItem
          label={INTELLIGENCE_OUTPUT.label}
          question={INTELLIGENCE_OUTPUT.question}
          href={INTELLIGENCE_OUTPUT.href}
          isActive={INTELLIGENCE_OUTPUT.label === activeLabel}
          indent
        />
      </ul>

      <div className="mt-4 border-t border-slate-800 pt-3">
        <p className="text-xs font-medium text-slate-400">{ANALYTICS_RELATED.label}</p>
        <p className="text-xs text-slate-500">{ANALYTICS_RELATED.question}</p>
        <p className="mt-1 text-xs text-slate-600">{ANALYTICS_RELATED.detail}</p>
        <Link href={ANALYTICS_RELATED.href} className="mt-2 inline-block text-xs text-sky-400 hover:underline">
          Open Analytics →
        </Link>
      </div>
    </div>
  );
}
