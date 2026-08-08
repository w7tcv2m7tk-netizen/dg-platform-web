import type { ReactNode } from "react";

/** Horizontal scroll container for wide tables — contains scroll traps on mobile. */
export function TableScroll({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dg-table-scroll rounded-xl border border-slate-800 ${className}`}>
      {children}
    </div>
  );
}
