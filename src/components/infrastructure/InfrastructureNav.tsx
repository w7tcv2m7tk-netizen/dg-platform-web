"use client";

import Link from "next/link";
import { INFRASTRUCTURE_NAV, type InfrastructureNavId } from "@dg/platform-core";

export function InfrastructureNav({ active }: { active: InfrastructureNavId }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Infrastructure">
      {INFRASTRUCTURE_NAV.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-md px-3 py-1.5 text-sm ${
            active === item.id
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
