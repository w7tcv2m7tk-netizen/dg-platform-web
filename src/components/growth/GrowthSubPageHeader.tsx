export function GrowthSubPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="dg-page-header">
      <p className="dg-page-eyebrow">Growth</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="dg-app-page-title !mt-0">{title}</h1>
        {actions}
      </div>
      {description ? <p className="dg-page-description">{description}</p> : null}
    </header>
  );
}
