import Link from "next/link";

/** Placeholder — deploy pipeline not shipped for AU pilot. */
export default function Page() {
  return (
    <section className="mt-2 max-w-xl space-y-3 text-sm text-slate-300">
      <h1 className="text-xl font-semibold text-white">Deployments</h1>
      <p className="text-slate-400">
        Staging / production deploy console is coming later. Publish sites from
        Website Studio for the AU pilot.
      </p>
      <p>
        Go to{" "}
        <Link href="/apps/websites" className="text-sky-400 hover:underline">
          Websites
        </Link>{" "}
        → Studio → Publish / Make it live.
      </p>
    </section>
  );
}
