export function IndustryAppTitle({ title, description, eyebrow = "Industry App" }: { title: string; description: string; eyebrow?: string }) {
  return (
    <header className="dg-page-header">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">{eyebrow}</p>
      <h1 className="dg-page-title mt-1 text-white">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400 sm:text-base">{description}</p>
    </header>
  );
}
