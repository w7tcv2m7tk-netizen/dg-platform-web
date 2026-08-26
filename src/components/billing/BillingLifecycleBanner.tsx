import Link from "next/link";
import type { BillingBannerModel } from "@dg/platform-core";

export function BillingLifecycleBanner({ banner }: { banner: BillingBannerModel }) {
  if (!banner || banner.kind === "none") return null;

  const toneClass =
    banner.tone === "danger"
      ? "border-rose-500/40 bg-rose-950/40 text-rose-50"
      : banner.tone === "warning"
        ? "border-amber-500/40 bg-amber-950/35 text-amber-50"
        : banner.tone === "info"
          ? "border-sky-500/35 bg-sky-950/30 text-sky-50"
          : "border-slate-600 bg-slate-900/60 text-slate-100";

  return (
    <div
      className={`shrink-0 border-b px-4 py-3 sm:px-6 md:px-8 ${toneClass}`}
      role="status"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{banner.title}</p>
          <p className="mt-0.5 text-sm opacity-90">{banner.body}</p>
        </div>
        {banner.ctaHref && banner.ctaLabel ? (
          <Link
            href={banner.ctaHref}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            {banner.ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
