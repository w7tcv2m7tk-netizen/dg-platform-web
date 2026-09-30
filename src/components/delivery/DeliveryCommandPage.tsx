import type { ReactNode } from "react";

import type { DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";

export function DeliveryCommandPage({
  title,
  description,
  children,
  navActive: _navActive,
  headerActions,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  navActive: DeliveryNavId;
  headerActions?: ReactNode;
}) {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description ? (
          <div className="mt-1 max-w-2xl text-sm text-slate-400">{description}</div>
        ) : null}
        {headerActions ? <div className="mt-4">{headerActions}</div> : null}
      </header>
      <main className="dg-page-main space-y-6">{children}</main>
    </>
  );
}
