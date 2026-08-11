import Link from "next/link";

type EmptyAction = { href: string; label: string };

export function ReviewsEmptyState({
  title,
  description,
  detail,
  tone = "neutral",
  actions = [],
}: {
  title: string;
  description: string;
  detail?: string | null;
  tone?: "neutral" | "amber" | "danger";
  actions?: EmptyAction[];
}) {
  const border =
    tone === "danger"
      ? "border-rose-800/70 bg-rose-950/20"
      : tone === "amber"
        ? "border-amber-800/60 bg-amber-950/15"
        : "border-slate-700 bg-slate-900/30";

  return (
    <div className={`rounded-xl border border-dashed px-6 py-10 text-center ${border}`}>
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{description}</p>
      {detail ? (
        <p
          className={
            tone === "danger"
              ? "mx-auto mt-3 max-w-lg text-sm text-rose-300/90"
              : tone === "amber"
                ? "mx-auto mt-3 max-w-lg text-sm text-amber-300/90"
                : "mx-auto mt-3 max-w-lg text-sm text-slate-500"
          }
        >
          {detail}
        </p>
      ) : null}
      {actions.length ? (
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          {actions.map((action) => (
            <Link key={action.href + action.label} href={action.href} className="text-sky-400 hover:underline">
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
