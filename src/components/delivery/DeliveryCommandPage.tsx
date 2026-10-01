import type { ReactNode } from "react";

import type { DeliveryNavId } from "@/components/delivery/DeliveryWorkspaceNav";

export function DeliveryCommandPage({
  eyebrow = "Delivery",
  title,
  description,
  children,
  navActive: _navActive,
  headerActions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  navActive: DeliveryNavId;
  headerActions?: ReactNode;
}) {
  return (
    <>
      <header className="dg-page-header">
        <p className="dg-page-eyebrow">{eyebrow}</p>
        <h1 className="dg-app-page-title">{title}</h1>
        {description ? (
          <div className="dg-page-description">{description}</div>
        ) : null}
        {headerActions ? <div className="mt-4">{headerActions}</div> : null}
      </header>
      <main className="dg-page-main space-y-6">{children}</main>
    </>
  );
}
