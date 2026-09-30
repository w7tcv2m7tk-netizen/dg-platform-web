export function OperatorCategoryHeader({ title, question }: { eyebrow?: string; title: string; question?: string; backHref?: string; backLabel?: string }) {
  return <div><h1 className="text-2xl font-bold text-white">{title}</h1>{question ? <p className="mt-1 max-w-3xl text-sm text-slate-400">{question}</p> : null}</div>;
}
