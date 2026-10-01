export type PageHeaderFamily =
  | "Operator"
  | "Business"
  | "Core"
  | "Growth"
  | "Communications"
  | "Commerce"
  | "Documents"
  | "Infrastructure"
  | "Integrations"
  | "Platform"
  | "Programme"
  | "Subscription"
  | "Support";

export function AppPageHeader({
  family,
  title,
  description,
  children,
}: {
  family: PageHeaderFamily | string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="dg-page-header">
      <p className="dg-page-eyebrow">{family}</p>
      <h1 className="dg-app-page-title">{title}</h1>
      {description ? <p className="dg-page-description">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
