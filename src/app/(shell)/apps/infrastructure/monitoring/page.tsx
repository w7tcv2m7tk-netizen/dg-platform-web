import Link from "next/link";

/** Placeholder — uptime monitoring not shipped for AU pilot. */
export default function Page() {
  return (
    <section className="mt-2 max-w-xl space-y-3 text-sm text-slate-300">
      <h1 className="text-xl font-semibold text-white">Monitoring</h1>
      <p className="text-slate-400">
        Uptime and performance monitoring is coming later for this app.
      </p>
      <p>
        For live sites, check{" "}
        <Link
          href="/apps/websites/hosting"
          className="text-sky-400 hover:underline"
        >
          Websites → Hosting
        </Link>{" "}
        and domain SSL status under{" "}
        <Link
          href="/apps/infrastructure/domains"
          className="text-sky-400 hover:underline"
        >
          Domains
        </Link>
        .
      </p>
    </section>
  );
}
