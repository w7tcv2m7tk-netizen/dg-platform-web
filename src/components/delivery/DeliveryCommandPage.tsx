import Link from "next/link";
import type { ReactNode } from "react";

import type { DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";

export function DeliveryCommandPage({
  title,
  description,
  children,
  navActive: _navActive,
  eyebrow = "Partners · Delivery",
  backHref = "/command",
  backLabel = "Command Centre",
  headerActions,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  navActive: DeliveryNavId;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
}) {
  return (
    <>
      <header className="dg-page-header">
        <Link href={backHref} className="text-sm text-sky-400 hover:underline">
          ← {backLabel}
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400/90">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">{title}</h1>
        {description ? (
          <div className="mt-1 max-w-2xl text-sm text-slate-400">{description}</div>
        ) : null}
        {headerActions ? <div className="mt-4">{headerActions}</div> : null}
      </header>
      <main className="dg-page-main space-y-6">{children}</main>
    </>
  );
}
