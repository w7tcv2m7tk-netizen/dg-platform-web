export function ProspectingPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="dg-page-header">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
        Growth
      </p>
      <h1 className="mt-1 text-2xl font-bold text-white">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400 sm:text-base">{description}</p>
    </header>
  );
}
