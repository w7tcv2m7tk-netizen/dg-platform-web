export function DeliveryPlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl rounded-xl border border-dashed border-slate-700 bg-slate-800/20 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}
