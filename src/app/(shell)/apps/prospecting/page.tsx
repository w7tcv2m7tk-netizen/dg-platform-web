import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ProspectingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view;
  redirect(view === "today" ? "/apps/prospecting/today" : "/apps/prospecting/overview");
}
