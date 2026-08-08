import Link from "next/link";

/** Placeholder — website hosting lives under Websites. */
export default function Page() {
  return (
    <section className="mt-2 max-w-xl space-y-3 text-sm text-slate-300">
      <h1 className="text-xl font-semibold text-white">Hosting</h1>
      <p className="text-slate-400">
        Infrastructure Hosting console is coming later. Website hosting and
        custom domains are managed in Websites today.
      </p>
      <p>
        Use{" "}
        <Link
          href="/apps/websites/hosting"
          className="text-sky-400 hover:underline"
        >
          Websites → Hosting
        </Link>{" "}
        and{" "}
        <Link
          href="/apps/infrastructure/domains"
          className="text-sky-400 hover:underline"
        >
          Domains
        </Link>{" "}
        for go-live DNS / SSL.
      </p>
    </section>
  );
}
