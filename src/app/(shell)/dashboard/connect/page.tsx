import dynamic from "next/dynamic";

const ConnectBusinessSetup = dynamic(
  () => import("@/components/onboarding/ConnectBusinessSetup").then((mod) => mod.ConnectBusinessSetup),
  { loading: () => <section className="mx-auto max-w-4xl py-8"><div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-400">Loading connection setup…</div></section> },
);

export default function ConnectBusinessSetupPage(){return <main className="dg-page-main"><ConnectBusinessSetup /></main>;}
